import { findByName, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { installPlugin } from "@vendetta/plugins";
import { installTheme } from "@vendetta/themes";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { Forms } from "@vendetta/ui/components";
import { showToast } from "@vendetta/ui/toasts";
import { APIMessage } from "discord-api-types/v10";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");

const { FormRow } = Forms;
const Icon = findByName("Icon");

const HTTP_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

let unpatch;

export default {
    onLoad: () => {
        unpatch = before("openLazy", LazyActionSheet, ([sheet, name]) => {
            if (name !== "MessageLongPressActionSheet") return;

            sheet.then((instance) => {
                const unpatchInstance = after("default", instance, ([{ message }]: [{ message: APIMessage }], res) => {
                    React.useEffect(() => () => { unpatchInstance() }, []);

                    const links = message.content?.match(HTTP_REGEX)?.map((link) => link.endsWith("/") || link.endsWith(".json") ? link : `${link}/`) ?? [];

                    let rows = res?.props?.children?.props?.children?.props?.children[1] as Array<JSX.Element>;

                    for (const link of links.reverse()) {
                        const installRow = (<FormRow
                            leading={<Icon source={getAssetIDByName("ic_download_24px")} />}
                            label={`Install ${link}`}
                            onPress={() => {
                                // @ts-expect-error
                                (link.endsWith(".json") ? installTheme : installPlugin)(link).then(() => {
                                    showToast(`Successfully installed ${link}`, getAssetIDByName("Check"));
                                }).catch((e) => {
                                    showToast(e.message, getAssetIDByName("Small"));
                                }).finally(() => { if (links.length <= 1) LazyActionSheet.hideActionSheet() })
                            }}
                        />);

                        rows.unshift(installRow);
                    };
                });
            });
        });
    },
    onUnload: () => {
        unpatch();
    },
};
