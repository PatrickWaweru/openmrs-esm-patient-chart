import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import capitalize from 'lodash-es/capitalize';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { ArrowLeft } from '@carbon/react/icons';
import { age, formatDate, parseDate, useLayoutType, usePatient } from '@openmrs/esm-framework';
import {
  type DefaultWorkspaceProps,
  launchPatientWorkspace,
  type OrderBasketItem,
} from '@openmrs/esm-patient-common-lib';
import { TestTypeSearch } from './procedures-type-search';
import { ProceduresOrderForm } from './procedures-order-form.component';
import styles from './add-procedures-order.scss';
import { type ProceduresOrderBasketItem } from '../../types';

export interface AddProceduresOrderWorkspaceAdditionalProps {
  order?: OrderBasketItem;
}

export interface AddProceduresOrderWorkspace
  extends DefaultWorkspaceProps,
    AddProceduresOrderWorkspaceAdditionalProps {}

// Design: https://app.zeplin.io/project/60d5947dd636aebbd63dce4c/screen/640b06c440ee3f7af8747620
export default function AddProceduresOrderWorkspace({
  order: initialOrder,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}: AddProceduresOrderWorkspace) {
  console.warn('Hey: We got here');
  const { t } = useTranslation();

  const { patient, isLoading: isLoadingPatient } = usePatient();
  const [currentLabOrder, setCurrentLabOrder] = useState(initialOrder as ProceduresOrderBasketItem);

  const isTablet = useLayoutType() === 'tablet';

  const patientName = `${patient?.name?.[0]?.given?.join(' ')} ${patient?.name?.[0].family}`;

  const cancelOrder = useCallback(() => {
    closeWorkspace({
      ignoreChanges: true,
      onWorkspaceClose: () => launchPatientWorkspace('order-basket'),
    });
  }, [closeWorkspace]);

  return (
    <div className={styles.container}>
      <p>Test 3</p>
      {isTablet && !isLoadingPatient && (
        <div className={styles.patientHeader}>
          <span className={styles.bodyShort02}>{patientName}</span>
          <span className={classNames(styles.text02, styles.bodyShort01)}>
            {capitalize(patient?.gender)} &middot; {age(patient?.birthDate)} &middot;{' '}
            <span>{formatDate(parseDate(patient?.birthDate), { mode: 'wide', time: false })}</span>
          </span>
        </div>
      )}
      {!isTablet && (
        <div className={styles.backButton}>
          <Button
            kind="ghost"
            renderIcon={(props) => <ArrowLeft size={24} {...props} />}
            iconDescription="Return to order basket"
            size="sm"
            onClick={cancelOrder}
          >
            <span>{t('backToOrderBasket', 'Back to order basket')}</span>
          </Button>
        </div>
      )}
      {!currentLabOrder ? (
        <div>
          <p>Test 1</p>
          <TestTypeSearch openLabForm={setCurrentLabOrder} />
        </div>
      ) : (
        <div>
          <p>Test 2</p>
          <ProceduresOrderForm
            initialOrder={currentLabOrder}
            closeWorkspace={closeWorkspace}
            closeWorkspaceWithSavedChanges={closeWorkspaceWithSavedChanges}
            promptBeforeClosing={promptBeforeClosing}
          />
        </div>
      )}
    </div>
  );
}
