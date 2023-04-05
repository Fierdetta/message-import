import { plugin } from "@vendetta";
import { removePlugin } from "@vendetta/plugins";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

export default {
    onLoad: () => {
        setTimeout(() => {
            removePlugin(plugin.id)
            showToast("Message import has been superceded by features built into Vendetta and removed from your client.", getAssetIDByName("ic_information_24px"))

        })
    },
};
