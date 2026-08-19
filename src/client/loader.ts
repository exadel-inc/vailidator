import { h, render } from 'preact';
import { App } from './components/App';
import styles from './components/styles.less';

// Bootstrap the AEM audit UI inside a shadow root so it is isolated from the
// host AEM author page styles.
(function bootstrap() {
  if (document.getElementById('aem-audit-app')) return;

  const host = document.createElement('div');
  host.id = 'aem-audit-app';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = styles;

  const mount = document.createElement('div');

  shadow.appendChild(style);
  shadow.appendChild(mount);
  document.body.appendChild(host);

  render(h(App, null), mount);

  console.log('[AEM Audit] Loader UI injected.');
})();
