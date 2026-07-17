# CreateTransactionDTO


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**type** | **string** |  | [optional] [default to undefined]
**fromAccountId** | **string** |  | [optional] [default to undefined]
**toAccountId** | **string** |  | [optional] [default to undefined]
**account** | [**CreateTransactionDTOAccountRef**](CreateTransactionDTOAccountRef.md) |  | [optional] [default to undefined]
**category** | [**CreateTransactionDTOAccountRef**](CreateTransactionDTOAccountRef.md) |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**amount** | **number** |  | [optional] [default to undefined]
**currency** | **string** |  | [optional] [default to undefined]
**date** | **string** |  | [optional] [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]
**payee** | [**CreateTransactionDTOPayeeRef**](CreateTransactionDTOPayeeRef.md) |  | [optional] [default to undefined]
**payeeName** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CreateTransactionDTO } from './api';

const instance: CreateTransactionDTO = {
    type,
    fromAccountId,
    toAccountId,
    account,
    category,
    name,
    amount,
    currency,
    date,
    notes,
    payee,
    payeeName,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
