export default /*html*/ `<mwc-dialog id="login-dialog" heading="Login to Javascript VM contract">
    <h4>Select a JS in Rust contract ( no deployments supported, only uploading files )</h4>
    <mwc-select id="contractselect" label="contract">
        
    </mwc-select>
    <h4>or any of your own accounts</h4>
    <p>Deploying contracts requires a <b>full access key</b> to the target account.</p>
    <mwc-textfield id="contractinput"></mwc-textfield>
    <mwc-button slot="primaryAction" dialogAction="login">
        Login
    </mwc-button>
    <mwc-button slot="secondaryAction" dialogAction="cancel">
        Cancel
    </mwc-button>
</mwc-dialog>`;