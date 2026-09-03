# TransactionDTO


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**amount** | **number** |  | [default to undefined]
**type** | **string** |  | [default to undefined]
**date** | **string** |  | [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**payee** | [**TransactionDTOPayee**](TransactionDTOPayee.md) |  | [optional] [default to undefined]
**categoryName** | **string** |  | [optional] [default to undefined]
**categoryId** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [default to undefined]
**currency** | **string** |  | [default to undefined]
**entries** | **Array&lt;object&gt;** |  | [optional] [default to undefined]
**comments** | [**Array&lt;TransactionDTOCommentsInner&gt;**](TransactionDTOCommentsInner.md) |  | [optional] [default to undefined]

## Example

```typescript
import { TransactionDTO } from './api';

const instance: TransactionDTO = {
    id,
    amount,
    type,
    date,
    notes,
    name,
    payee,
    categoryName,
    categoryId,
    status,
    currency,
    entries,
    comments,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
