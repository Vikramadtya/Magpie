# TransactionDTO


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**date** | **string** |  | [default to undefined]
**notes** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**payee** | **any** |  | [default to undefined]
**status** | **string** |  | [default to undefined]
**entries** | [**Array&lt;LedgerEntryDTO&gt;**](LedgerEntryDTO.md) |  | [default to undefined]
**comments** | **Array&lt;object&gt;** |  | [default to undefined]

## Example

```typescript
import { TransactionDTO } from './api';

const instance: TransactionDTO = {
    id,
    date,
    notes,
    name,
    payee,
    status,
    entries,
    comments,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
