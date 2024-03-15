import React, { useCallback, useEffect, useState, useMemo } from 'react';
import classNames from 'classnames';
import {
  type DefaultWorkspaceProps,
  launchPatientWorkspace,
  promptBeforeClosing,
  useOrderBasket,
} from '@openmrs/esm-patient-common-lib';
import { translateFrom, useLayoutType, useSession, useConfig } from '@openmrs/esm-framework';
import { careSettingUuid, prepProceduresOrderPostData, useOrderReasons, useConceptById, type Concept } from '../api';
import {
  Button,
  ButtonSet,
  Column,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Form,
  FormLabel,
  Toggle,
  Layer,
  Grid,
  InlineNotification,
  TextInput,
  TextArea,
  Checkbox,
  FormGroup,
  NumberInput,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { priorityOptions } from './procedures-order';
import { useProceduresTypes } from './useProceduresTypes';
import { type Control, Controller, type FieldErrors, useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { moduleName } from '@openmrs/esm-patient-chart-app/src/constants';
import { type ConfigObject } from '../../config-schema';
import styles from './procedures-order-form.scss';
import type { ProceduresOrderBasketItem, OrderFrequency } from '../../types';
import { Add, ArrowLeft, Subtract } from '@carbon/react/icons';
import { useOrderConfig } from '../order-config';
export interface LabOrderFormProps {
  initialOrder: ProceduresOrderBasketItem;
  closeWorkspace: DefaultWorkspaceProps['closeWorkspace'];
  closeWorkspaceWithSavedChanges: DefaultWorkspaceProps['closeWorkspaceWithSavedChanges'];
  promptBeforeClosing: DefaultWorkspaceProps['promptBeforeClosing'];
}

// Designs:
//   https://app.zeplin.io/project/60d5947dd636aebbd63dce4c/screen/640b06c440ee3f7af8747620
//   https://app.zeplin.io/project/60d5947dd636aebbd63dce4c/screen/640b06d286e0aa7b0316db4a
export function LabOrderForm({
  initialOrder,
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
}: LabOrderFormProps) {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const session = useSession();
  const { orderConfigObject, isLoading: isLoadingOrderConfig, error: errorFetchingOrderConfig } = useOrderConfig();
  const { orders, setOrders } = useOrderBasket<ProceduresOrderBasketItem>('procedures', prepProceduresOrderPostData);
  const { testTypes, isLoading: isLoadingTestTypes, error: errorLoadingTestTypes } = useProceduresTypes();
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const {
    items: { answers: lateralityItems },
    isLoading: isLoadingLaterality,
    isError: errorFetchingLaterality,
  } = useConceptById('160594AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  const {
    items: { answers: bodySiteItems },
    isLoading: isLoadingBodySiteItems,
    isError: errorFetchingBodySiteItems,
  } = useConceptById('162668AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  const {
    items: { answers: specimenSourceItems },
    isLoading: isLoadingSpecimenSourceItems,
    isError: errorFetchingSpecimenSourceItems,
  } = useConceptById('159959AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  const {
    items: { setMembers: specimenTypeItems },
    isLoading: isLoadingSpecimenTypeItems,
    isError: errorFetchingSpecimenTypeItems,
  } = useConceptById('162476AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  const config = useConfig<ConfigObject>();
  const orderReasonRequired = (
    config.labTestsWithOrderReasons?.find((c) => c.labTestUuid === initialOrder?.testType?.conceptUuid) || {}
  ).required;

  const proceduresOrderFormSchema = z.object({
    instructions: z.string().optional(),
    urgency: z.string().refine((value) => value !== '', {
      message: translateFrom(moduleName, 'addLabOrderPriorityRequired', 'Priority is required'),
    }),
    labReferenceNumber: z.string().optional(),
    testType: z.object(
      { label: z.string(), conceptUuid: z.string() },
      {
        required_error: translateFrom(moduleName, 'addLabOrderLabTestTypeRequired', 'Test type is required'),
        invalid_type_error: translateFrom(moduleName, 'addLabOrderLabReferenceRequired', 'Test type is required'),
      },
    ),
    orderReason: orderReasonRequired
      ? z
          .string({
            required_error: translateFrom(moduleName, 'addLabOrderLabOrderReasonRequired', 'Order reason is required'),
          })
          .refine(
            (value) => !!value,
            translateFrom(moduleName, 'addLabOrderLabOrderReasonRequired', 'Order reason is required'),
          )
      : z.string().optional(),
    // scheduleDate: z.union([z.date(), z.string()]).optional(),
    scheduleDate: z.date().optional(),
    commentsToFulfiller: z.string().optional(),
    laterality: z.string().optional(),
    numberOfRepeats: z.number().optional(),
    previousOrder: z.string().optional(),
  });

  const orderFrequencies: Array<OrderFrequency> = useMemo(
    () => orderConfigObject?.orderFrequencies ?? [],
    [orderConfigObject],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, defaultValues, isDirty },
  } = useForm<ProceduresOrderBasketItem>({
    mode: 'all',
    resolver: zodResolver(proceduresOrderFormSchema),
    defaultValues: {
      ...initialOrder,
    },
  });

  const orderReasonUuids =
    (config.labTestsWithOrderReasons?.find((c) => c.labTestUuid === defaultValues?.testType?.conceptUuid) || {})
      .orderReasons || [];

  const { orderReasons } = useOrderReasons(orderReasonUuids);

  const handleFormSubmission = useCallback(
    (data: ProceduresOrderBasketItem) => {
      data.action = 'NEW';
      data.careSetting = careSettingUuid;
      data.orderer = session.currentProvider.uuid;
      const newOrders = [...orders];
      const existingOrder = orders.find((order) => order.testType.conceptUuid == defaultValues.testType.conceptUuid);
      const orderIndex = existingOrder ? orders.indexOf(existingOrder) : orders.length;
      newOrders[orderIndex] = data;
      setOrders(newOrders);
      closeWorkspaceWithSavedChanges({
        onWorkspaceClose: () => launchPatientWorkspace('order-basket'),
      });
    },
    [orders, setOrders, closeWorkspace, session?.currentProvider?.uuid, defaultValues],
  );

  const cancelOrder = useCallback(() => {
    setOrders(orders.filter((order) => order.testType.conceptUuid !== defaultValues.testType.conceptUuid));
    closeWorkspace({
      onWorkspaceClose: () => launchPatientWorkspace('order-basket'),
    });
  }, [closeWorkspace, orders, setOrders, defaultValues]);

  const onError = (errors: FieldErrors<ProceduresOrderBasketItem>) => {
    if (errors) {
      setShowErrorNotification(true);
    }
  };

  useEffect(() => {
    promptBeforeClosing(() => isDirty);
  }, [isDirty]);

  const [selectedPriority, setSelectedPriority] = useState('');
  const [showScheduleDate, setShowScheduleDate] = useState(false);

  const handlePriorityChange = (event) => {
    const selectedValue = event.selectedItem ? event.selectedItem.label : '';
    setSelectedPriority(selectedValue);
    console.warn('Selected value is: ', selectedValue);
    // Set the state to show the TextInput based on the selected option
    setShowScheduleDate(selectedValue === 'Scheduled');
  };

  return (
    <>
      {errorLoadingTestTypes && (
        <InlineNotification
          kind="error"
          lowContrast
          className={styles.inlineNotification}
          title={t('errorLoadingTestTypes', 'Error occured when loading test types')}
          subtitle={t('tryReopeningTheForm', 'Please try launching the form again')}
        />
      )}
      <Form className={styles.orderForm} onSubmit={handleSubmit(handleFormSubmission, onError)} id="procedureOrderForm">
        <div className={styles.form}>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="testType"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="testTypeInput"
                      titleText={t('testType', 'Test type')}
                      selectedItem={value}
                      items={testTypes}
                      placeholder={
                        isLoadingTestTypes ? `${t('loading', 'Loading')}...` : t('testTypePlaceholder', 'Select one')
                      }
                      onBlur={onBlur}
                      disabled={isLoadingTestTypes}
                      onChange={({ selectedItem }) => onChange(selectedItem)}
                      invalid={errors.testType?.message}
                      invalidText={errors.testType?.message}
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={8} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="urgency"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="priorityInput"
                      titleText={t('priority', 'Priority')}
                      // selectedItem={priorityOptions.find((option) => option.value === value) || null}
                      selectedItem={selectedPriority}
                      items={priorityOptions}
                      onBlur={onBlur}
                      // onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      onChange={handlePriorityChange}
                      invalid={errors.urgency?.message}
                      invalidText={errors.urgency?.message}
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          {showScheduleDate && (
            <Grid className={styles.gridRow}>
              <Column lg={16} md={4} sm={4}>
                <div className={styles.fullWidthDatePickerContainer}>
                  <InputWrapper>
                    <Controller
                      name="scheduleDate"
                      control={control}
                      render={({ field: { onBlur, value, onChange, ref } }) => (
                        <DatePicker
                          datePickerType="single"
                          maxDate={new Date().toISOString()}
                          value={value}
                          onChange={([newStartDate]) => onChange(newStartDate)}
                          onBlur={onBlur}
                          ref={ref}
                        >
                          <DatePickerInput
                            id="scheduleDatePicker"
                            placeholder="mm/dd/yyyy"
                            labelText={t('scheduleDate', 'Scheduled date')}
                            size="lg"
                          />
                        </DatePicker>
                      )}
                    />
                  </InputWrapper>
                </div>
              </Column>
            </Grid>
          )}
          {orderReasons.length > 0 && (
            <Grid className={styles.gridRow}>
              <Column lg={16} md={8} sm={4}>
                <InputWrapper>
                  <Controller
                    name="orderReason"
                    control={control}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ComboBox
                        size="lg"
                        id="orderReasonInput"
                        titleText={t('orderReason', 'Order reason')}
                        selectedItem={''}
                        itemToString={(item) => item?.display}
                        items={orderReasons}
                        onBlur={onBlur}
                        onChange={({ selectedItem }) => onChange(selectedItem?.uuid || '')}
                        invalid={errors.orderReason?.message}
                        invalidText={errors.orderReason?.message}
                      />
                    )}
                  />
                </InputWrapper>
              </Column>
            </Grid>
          )}
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="laterality"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="lateralityInput"
                      titleText={t('laterality', 'Laterality')}
                      // selectedItem={lateralityItems.find((option) => option.uuid === value) || null}
                      items={lateralityItems}
                      onBlur={onBlur}
                      onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      invalid={errors.laterality?.message}
                      invalidText={errors.laterality?.message}
                      itemToString={(item) => item?.display}
                      disabled={isLoadingLaterality}
                      placeholder={
                        isLoadingOrderConfig ? `${t('loading', 'Loading')}...` : t('testTypePlaceholder', 'Select one')
                      }
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="bodySite"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="bodySiteInput"
                      titleText={t('bodySite', 'Body Site')}
                      // selectedItem={lateralityItems.find((option) => option.uuid === value) || null}
                      items={bodySiteItems}
                      onBlur={onBlur}
                      onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      invalid={errors.laterality?.message}
                      invalidText={errors.laterality?.message}
                      itemToString={(item) => item?.display}
                      disabled={isLoadingBodySiteItems}
                      placeholder={
                        isLoadingBodySiteItems
                          ? `${t('loading', 'Loading')}...`
                          : t('testTypePlaceholder', 'Select one')
                      }
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="specimenSource"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="specimenSourceInput"
                      titleText={t('specimenSource', 'Specimen Source')}
                      // selectedItem={lateralityItems.find((option) => option.uuid === value) || null}
                      items={specimenSourceItems}
                      onBlur={onBlur}
                      onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      invalid={errors.laterality?.message}
                      invalidText={errors.laterality?.message}
                      itemToString={(item) => item?.display}
                      disabled={isLoadingSpecimenSourceItems}
                      placeholder={
                        isLoadingSpecimenSourceItems
                          ? `${t('loading', 'Loading')}...`
                          : t('testTypePlaceholder', 'Select one')
                      }
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="specimenType"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="specimenTypeInput"
                      titleText={t('specimenType', 'Specimen Type')}
                      // selectedItem={lateralityItems.find((option) => option.uuid === value) || null}
                      items={specimenTypeItems}
                      onBlur={onBlur}
                      onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      invalid={errors.specimenType?.message}
                      invalidText={errors.specimenType?.message}
                      // itemToString={(item) => item?.display}
                      itemToString={(item?: Concept) => (item && item?.display ? `${item?.display}` : '')}
                      disabled={isLoadingSpecimenTypeItems}
                      placeholder={
                        isLoadingSpecimenTypeItems
                          ? `${t('loading', 'Loading')}...`
                          : t('testTypePlaceholder', 'Select one')
                      }
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <NumberInput
                  id="numberOfRepeats"
                  label={t('numberOfRepeats', 'Number Of Repeats')}
                  min={0}
                  // onChange={(event) => field.onChange(parseInt(event.target.value || 0))}
                  // value={field.value}
                  hideSteppers={false}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ComboBox
                      size="lg"
                      id="frequencyInput"
                      titleText={t('frequency', 'Frequency')}
                      selectedItem={orderFrequencies.find((option) => option.value === value) || null}
                      items={orderFrequencies}
                      onBlur={onBlur}
                      onChange={({ selectedItem }) => onChange(selectedItem?.value || '')}
                      invalid={errors.frequency?.message}
                      invalidText={errors.frequency?.message}
                      itemToString={(item) => item?.value}
                      disabled={isLoadingOrderConfig}
                      placeholder={
                        isLoadingOrderConfig ? `${t('loading', 'Loading')}...` : t('testTypePlaceholder', 'Select one')
                      }
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="instructions"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextArea
                      enableCounter
                      id="additionalInstructionsInput"
                      size="lg"
                      labelText={t('additionalInstructions', 'Additional instructions')}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      maxCount={500}
                      invalid={errors.instructions?.message}
                      invalidText={errors.instructions?.message}
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
          <Grid className={styles.gridRow}>
            <Column lg={16} md={8} sm={4}>
              <InputWrapper>
                <Controller
                  name="commentsToFulfiller"
                  control={control}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextArea
                      enableCounter
                      id="commentsToFulfillerInput"
                      size="lg"
                      labelText={t('commentsToFulfiller', 'Comments To Fulfiller')}
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      maxCount={500}
                      invalid={errors.commentsToFulfiller?.message}
                      invalidText={errors.commentsToFulfiller?.message}
                    />
                  )}
                />
              </InputWrapper>
            </Column>
          </Grid>
        </div>
        <div>
          {showErrorNotification && (
            <Column className={styles.errorContainer}>
              <InlineNotification
                lowContrast
                title={t('error', 'Error')}
                subtitle={t('pleaseRequiredFields', 'Please fill all required fields') + '.'}
                onClose={() => setShowErrorNotification(false)}
              />
            </Column>
          )}
          <ButtonSet
            className={classNames(styles.buttonSet, isTablet ? styles.tabletButtonSet : styles.desktopButtonSet)}
          >
            <Button className={styles.button} kind="secondary" onClick={cancelOrder} size="xl">
              {t('discard', 'Discard')}
            </Button>
            <Button className={styles.button} kind="primary" type="submit" size="xl">
              {t('saveOrder', 'Save order')}
            </Button>
          </ButtonSet>
        </div>
      </Form>
    </>
  );
}

function InputWrapper({ children }) {
  const isTablet = useLayoutType() === 'tablet';
  return (
    <Layer level={isTablet ? 1 : 0}>
      <div className={styles.field}>{children}</div>
    </Layer>
  );
}
