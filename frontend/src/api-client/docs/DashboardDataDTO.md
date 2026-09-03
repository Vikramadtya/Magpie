# DashboardDataDTO


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**keyMetrics** | [**DashboardDataDTOKeyMetrics**](DashboardDataDTOKeyMetrics.md) |  | [default to undefined]
**recentTransactions** | **Array&lt;object&gt;** |  | [default to undefined]
**netWorth** | [**Array&lt;DashboardDataDTONetWorthInner&gt;**](DashboardDataDTONetWorthInner.md) |  | [default to undefined]
**spendingByCategory** | [**Array&lt;DashboardDataDTOSpendingByCategoryInner&gt;**](DashboardDataDTOSpendingByCategoryInner.md) |  | [default to undefined]
**categorySpending** | [**Array&lt;DashboardDataDTOSpendingByCategoryInner&gt;**](DashboardDataDTOSpendingByCategoryInner.md) |  | [default to undefined]
**cashFlow** | **Array&lt;object&gt;** |  | [default to undefined]

## Example

```typescript
import { DashboardDataDTO } from './api';

const instance: DashboardDataDTO = {
    keyMetrics,
    recentTransactions,
    netWorth,
    spendingByCategory,
    categorySpending,
    cashFlow,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
