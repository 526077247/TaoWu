"use strict";var __awaiter=this&&this.__awaiter||function(e,a,p,u){return new(p=p||Promise)(function(n,i){function t(e){try{l(u.next(e))}catch(e){i(e)}}function o(e){try{l(u.throw(e))}catch(e){i(e)}}function l(e){var i;e.done?n(e.value):((i=e.value)instanceof p?i:new p(function(e){e(i)})).then(t,o)}l((u=u.apply(e,a||[])).next())})};Object.defineProperty(exports,"__esModule",{value:!0}),exports.close=exports.ready=exports.update=exports.$=exports.template=exports.style=void 0;const global_1=require("./global");let panel;function update(e,i){return __awaiter(this,void 0,void 0,function*(){i||init()})}function ready(e){(panel=this).options=e,init()}function close(){panel.$.hideLink.removeEventListener("change",onHideLinkChange)}function init(){panel.$.hideLink.value=panel.options.hideLink,updateLink(),panel.$.hideLink.addEventListener("change",onHideLinkChange)}function onHideLinkChange(e){panel.options.hideLink=e.target.value,panel.dispatch("update",`packages.${global_1.PACKAGE_NAME}.hideLink`,panel.options.hideLink),updateLink()}function updateLink(){panel.options.hideLink?panel.$.link.style.display="none":panel.$.link.style.display="block"}exports.style="",exports.template=`
<div class="build-plugin">
    <ui-prop>
        <ui-label slot="label" value="Hide Link"></ui-label>
        <ui-checkbox slot="content"></ui-checkbox>
    </ui-prop>
    <ui-prop id="link">
        <ui-label slot="label" value="Docs"></ui-label>
        <ui-link slot="content" value=${Editor.Utils.Url.getDocUrl("editor/publish/custom-build-plugin.html")}></ui-link>
    </ui-prop>
</div>
`,exports.$={root:".build-plugin",hideLink:"ui-checkbox",link:"#link"},exports.update=update,exports.ready=ready,exports.close=close;