import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  orderEncounterType: {
    _type: Type.UUID,
    _description: 'The encounter type of the encounter encapsulating orders',
    _default: 'e1406e88-e9a9-11e8-9f32-f2801f1b9fd1',
  },
};

export interface ConfigObject {
  orderEncounterType: string;
}
