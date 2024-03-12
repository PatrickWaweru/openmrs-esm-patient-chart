import React from 'react';
import styles from './procedures-order.scss';
import { type Order } from '@openmrs/esm-patient-common-lib';

interface ProceduresOrderProps {
  proceduresOrder: Order;
}

const ProceduresOrder: React.FC<ProceduresOrderProps> = ({ proceduresOrder }) => {
  return (
    <div className={styles.proceduresOrder}>
      <p>{proceduresOrder.concept.display}</p>
    </div>
  );
};

export default ProceduresOrder;
