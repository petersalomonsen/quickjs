export default /*html*/ `
<div style="display: flex; flex-direction: row;">
  <mwc-select id="bundletypeselect" label="target contract type">  
    <mwc-list-item value="minimum-web4" selected>Minimum Web4</mwc-list-item>
    <mwc-list-item value="nft">NFT</mwc-list-item>
  </mwc-select>
  <span style="flex-grow: 1"></span>
  <mwc-button raised id="askaibutton" icon="question_mark" style="display: none;">Ask AI</mwc-button>
</div>
<p>
  <code-editor id="sourcecodeeditor"></code-editor>
</p>

<p>
  <mwc-button raised id="savebutton" icon="save">Save</mwc-button>
  <mwc-button raised id="deploybutton">Deploy</mwc-button>
</p>

<h3>Simulation</h3>
<p>
  <mwc-select id="methodselect" label="method"></mwc-select>

  <mwc-textfield id="depositinput" label="attached deposit" type="number"></mwc-textfield>
  <mwc-textfield id="signeraccountidinput" label="signer account id"></mwc-textfield>
  
</p>
Arguments (json):<br />
<args-editor id="argumentsinput"></args-editor>
<p>
  <mwc-button raised id="simulatebutton" icon="play_arrow">Run</mwc-button>
<p>

<div class="outputarea">
  <pre><code id="simulationoutput"></code></pre>
</div>

<mwc-dialog id="deploy-contract-dialog" heading="Deploy contract?">
  <div>This will overwrite the existing contract.</div>
  <mwc-button slot="primaryAction" dialogAction="deploy">
    Deploy
  </mwc-button>
  <mwc-button slot="secondaryAction" dialogAction="cancel">
    Cancel
  </mwc-button>
</mwc-dialog>

<mwc-dialog id="error-deploying-contract-dialog" heading="Error deploying contract">
  <div id="errormessage"></div>
  <mwc-button slot="primaryAction" dialogAction="dismiss">
    Close
  </mwc-button>
</mwc-dialog>


<mwc-snackbar id="compileErrorSnackbar" labelText="Compile error. See simulation output">
  <mwc-icon-button icon="close" slot="dismiss"></mwc-icon-button>
</mwc-snackbar>

<mwc-snackbar id="selectMethodSnackbar" labelText="Select method for running">
  <mwc-icon-button icon="close" slot="dismiss"></mwc-icon-button>
</mwc-snackbar>

<mwc-snackbar id="successDeploySnackbar" labelText="Successfully deployed contract">
  <mwc-icon-button icon="close" slot="dismiss"></mwc-icon-button>
</mwc-snackbar>

<mwc-snackbar id="selectTargetContractTypeSnackbar" labelText="Select target contract type">
  <mwc-icon-button icon="close" slot="dismiss"></mwc-icon-button>
</mwc-snackbar>`;