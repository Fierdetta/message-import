import { findByDisplayName, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { installPlugin } from "@vendetta/plugins";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { safeFetch } from "@vendetta/utils";
import { APIMessage } from "discord-api-types/v10";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");

const { FormRow } = Forms;
const Icon = findByDisplayName("Icon");

const HTTP_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

let unpatch;

export default {
    onLoad: () => {
        unpatch = before("openLazy", LazyActionSheet, ([sheet, name]) => {
            if (name !== "MessageLongPressActionSheet") return;

            sheet.then((instance) => {
                const unpatchInstance = after("default", instance, ([{ message }]: [{ message: APIMessage }], res) => {
                    React.useEffect(() => () => { unpatchInstance() }, []);

                    const [pluginManifests, setPluginManifests] = React.useState<Indexable<PluginManifest>>({});

                    React.useEffect(() => {
                        const fetchPluginManifests = async () => {
                            const links = message.content.match(HTTP_REGEX).map((link) => link.endsWith("/") ? link : `${link}/`);

                            const pluginManifests: Indexable<PluginManifest> = {};

                            for (const link of links) {
                                try {
                                    const pluginManifest = await (await safeFetch(link + "manifest.json", { cache: "no-store" })).json() as PluginManifest;
                                    pluginManifests[link] = pluginManifest;
                                } catch {
                                    continue;
                                };
                            };

                            setPluginManifests(pluginManifests);
                        };

                        fetchPluginManifests();
                    }, [message.content])

                    let rows = res?.props?.children?.props?.children?.props?.children[1] as Array<JSX.Element>;

                    const pluginLinks = Object.keys(pluginManifests);

                    for (const pluginLink of pluginLinks) {
                        const installPluginRow = (<FormRow
                            leading={<Icon source={getAssetIDByName("ic_download_24px")} />}
                            label={`Install ${pluginManifests[pluginLink].name}`}
                            onPress={() => {
                                // @ts-expect-error
                                installPlugin(pluginLink).then(() => {
                                    showToast(`Successfully installed ${pluginManifests[pluginLink].name}`, getAssetIDByName("Check"));
                                }).catch((e) => {
                                    showToast(e.message, getAssetIDByName("Small"));
                                }).finally(() => { if (pluginLinks.length <= 1) LazyActionSheet.hideActionSheet() })
                            }}
                        />);

                        rows.unshift(installPluginRow);
                    };
                });
            });
        });
    },
    onUnload: () => {
        unpatch();
    },
};
