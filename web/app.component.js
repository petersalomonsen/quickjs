import '@material/mwc-top-app-bar';
import '@material/mwc-icon-button';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-drawer';
import '@material/mwc-list';
import '@material/mwc-textfield';
import '@material/mwc-select';
import '@material/mwc-snackbar';
import './code-editor/code-page.component.js';
import './callcontract/callcontract-page.component.js';
import './nearfs/nearfs-page.component.js';
import css from './app.component.css.js';
import html from './app.component.html.js';

import { setAppComponent, toggleIndeterminateProgress } from './common/progressindicator.js';
import { getNearConfig, createWalletConnection, checkSignedin, logout } from './near/near.js';

HTMLElement.prototype.attachStyleSheet = function (url) {
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = url;
    this.shadowRoot.appendChild(linkElement);
};

class AppComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.readyPromise = this.loadHTML();
    }

    async loadHTML() {
        this.shadowRoot.innerHTML = `<style>${css}</style>${html}`;
        setAppComponent(this);
        toggleIndeterminateProgress(true);
        const drawer = this.shadowRoot.querySelector('mwc-drawer');
        this.shadowRoot.querySelector('#toggleDrawerButton').addEventListener('click', () => {
            drawer.open = !drawer.open;
        });
        const widthmatcher = window.matchMedia("(max-width: 700px)");
        widthmatcher.addEventListener('change', e => {
            if (e.matches) {
                drawer.type = 'modal';
            } else {
                drawer.type = 'dismissible';
                drawer.open = true;
            }
        });
        if (!widthmatcher.matches) {
            drawer.type = 'dismissible';
            drawer.open = true;
        }
        const walletConnection = await createWalletConnection();
        await walletConnection.isSignedInAsync();

        const accountId = walletConnection.account().accountId;
        const loggedInUserSpan = this.shadowRoot.getElementById('loggedinuserspan');
        const logoutMenuItemTemplate = this.shadowRoot.getElementById('logout-menuitem-template');
        const loginMenuItemTemplate = this.shadowRoot.getElementById('login-menuitem-template');
        const leftmenu = this.shadowRoot.getElementById('leftmenu');

        const showNotLoggedIn = () => {
            loggedInUserSpan.innerHTML = '';
            const loginMenuItem = leftmenu.appendChild(loginMenuItemTemplate.content.firstElementChild.cloneNode(true));
            loginMenuItem.addEventListener('click', () => checkSignedin());
        };
        if (accountId) {
            loggedInUserSpan.innerHTML =
                `${accountId ?? ''} @ ${getNearConfig().contractName}`;
            logoutMenuItemTemplate.content.cloneNode(true)
            const logoutMenuItem = leftmenu.appendChild(logoutMenuItemTemplate.content.firstElementChild.cloneNode(true));
            logoutMenuItem.addEventListener('click', async () => {
                logoutMenuItem.remove();
                showNotLoggedIn();
                await logout();
            });
        } else {
            showNotLoggedIn();
        }

        const mainContainer = this.shadowRoot.querySelector('#mainContainer')
        window.goToPage = (page) => {
            const pageElement = document.createElement(`${page}-page`);
            const path = `/${page}`;
            if (location.pathname != path || location.search.indexOf('?account_id') == 0) {
                history.pushState({}, null, path);
            }
            mainContainer.replaceChildren(pageElement);
            if (widthmatcher.matches) {
                drawer.open = false;
            }
        }
        if (location.pathname.length > 1) {
            goToPage(location.pathname.substring(1));
        }
        if (location.search.indexOf('transactionHashes=') > 0) {
            goToPage('callcontract');
            this.shadowRoot.getElementById('callcontract-menuitem').selected = true;
        }

        toggleIndeterminateProgress(false);
    }
}

customElements.define('app-root', AppComponent);
