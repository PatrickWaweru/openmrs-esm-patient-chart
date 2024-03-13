import React from 'react';
import styles from './radiology-order.scss';
import { type Order } from '@openmrs/esm-patient-common-lib';

interface RadiologyOrderProps {
  radiologyOrder: Order;
}

const RadiologyOrder: React.FC<RadiologyOrderProps> = ({ radiologyOrder }) => {
  return (
    <div className={styles.radiologyOrder}>
      <p>{radiologyOrder.concept.display}</p>
    </div>
  );
};

export default RadiologyOrder;
