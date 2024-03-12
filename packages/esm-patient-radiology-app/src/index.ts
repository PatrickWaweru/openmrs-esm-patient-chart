import {
  defineConfigSchema,
  fhirBaseUrl,
  getAsyncLifecycle,
  getSyncLifecycle,
  messageOmrsServiceWorker,
  translateFrom,
} from '@openmrs/esm-framework';
import { createDashboardLink, registerWorkspace } from '@openmrs/esm-patient-common-lib';
import { configSchema } from './config-schema';
import { dashboardMeta } from './test-results/dashboard.meta';
import externalOverviewComponent from './test-results/overview/external-overview.extension';
import resultsViewerComponent from './test-results/results-viewer';

const moduleName = '@openmrs/esm-patient-radiology-app';

const options = {
  featureName: 'patient-labs',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  messageOmrsServiceWorker({
    type: 'registerDynamicRoute',
    pattern: `.+${fhirBaseUrl}/Observation.+`,
  });

  defineConfigSchema(moduleName, configSchema);
}

export const externalOverview = getSyncLifecycle(externalOverviewComponent, options);
export const resultsViewer = getSyncLifecycle(resultsViewerComponent, options);
export const printModal = getAsyncLifecycle(() => import('./test-results/print-modal/print-modal.extension'), options);

export const testResultsDashboardLink =
  // t('Results Viewer', 'Results Viewer')
  getSyncLifecycle(
    createDashboardLink({
      ...dashboardMeta,
      moduleName,
    }),
    options,
  );

export const radiologyOrderPanel = getAsyncLifecycle(
  () => import('./radiology-orders/radiology-order-basket-panel/radiology-order-basket-panel.extension'),
  options,
);

// t('addLabOrderWorkspaceTitle', 'Add lab order')
registerWorkspace({
  name: 'add-radiology-order',
  type: 'order',
  title: translateFrom(moduleName, 'addRadiologyOrderWorkspaceTitle', 'Add radiology order'),
  load: getAsyncLifecycle(
    () => import('./radiology-orders/add-radiology-order/add-radiology-order.workspace'),
    options,
  ),
});
