# TransactionApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createTransaction**](#createtransaction) | **POST** /api/v1/transactions/{workspaceId} | Create a transaction|
|[**deleteTransaction**](#deletetransaction) | **DELETE** /api/v1/transactions/{workspaceId}/{id} | Delete a transaction|
|[**getGroupedTransactions**](#getgroupedtransactions) | **GET** /api/v1/transactions/grouped/{workspaceId} | Get transactions grouped by date|
|[**getTransactions**](#gettransactions) | **GET** /api/v1/transactions/{workspaceId} | Get transactions|
|[**updateTransaction**](#updatetransaction) | **PUT** /api/v1/transactions/{workspaceId}/{id} | Update a transaction|

# **createTransaction**
> TransactionDTO createTransaction(transactionCreateDTO)


### Example

```typescript
import {
    TransactionApi,
    Configuration,
    TransactionCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let workspaceId: string; // (default to undefined)
let transactionCreateDTO: TransactionCreateDTO; //

const { status, data } = await apiInstance.createTransaction(
    workspaceId,
    transactionCreateDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **transactionCreateDTO** | **TransactionCreateDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**TransactionDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteTransaction**
> deleteTransaction()


### Example

```typescript
import {
    TransactionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)

const { status, data } = await apiInstance.deleteTransaction(
    workspaceId,
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getGroupedTransactions**
> { [key: string]: Array<TransactionDTO>; } getGroupedTransactions()


### Example

```typescript
import {
    TransactionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let workspaceId: string; // (default to undefined)
let accountId: string; // (optional) (default to undefined)
let startDate: string; // (optional) (default to undefined)
let endDate: string; // (optional) (default to undefined)
let type: string; // (optional) (default to undefined)
let search: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getGroupedTransactions(
    workspaceId,
    accountId,
    startDate,
    endDate,
    type,
    search
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **accountId** | [**string**] |  | (optional) defaults to undefined|
| **startDate** | [**string**] |  | (optional) defaults to undefined|
| **endDate** | [**string**] |  | (optional) defaults to undefined|
| **type** | [**string**] |  | (optional) defaults to undefined|
| **search** | [**string**] |  | (optional) defaults to undefined|


### Return type

**{ [key: string]: Array<TransactionDTO>; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTransactions**
> PageTransactionDTO getTransactions()


### Example

```typescript
import {
    TransactionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let workspaceId: string; // (default to undefined)
let page: number; // (optional) (default to 0)
let size: number; // (optional) (default to 20)
let sort: string; // (optional) (default to undefined)
let startDate: string; // (optional) (default to undefined)
let endDate: string; // (optional) (default to undefined)
let accountId: string; // (optional) (default to undefined)
let categoryId: string; // (optional) (default to undefined)
let payeeId: string; // (optional) (default to undefined)
let type: string; // (optional) (default to undefined)
let search: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getTransactions(
    workspaceId,
    page,
    size,
    sort,
    startDate,
    endDate,
    accountId,
    categoryId,
    payeeId,
    type,
    search
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **page** | [**number**] |  | (optional) defaults to 0|
| **size** | [**number**] |  | (optional) defaults to 20|
| **sort** | [**string**] |  | (optional) defaults to undefined|
| **startDate** | [**string**] |  | (optional) defaults to undefined|
| **endDate** | [**string**] |  | (optional) defaults to undefined|
| **accountId** | [**string**] |  | (optional) defaults to undefined|
| **categoryId** | [**string**] |  | (optional) defaults to undefined|
| **payeeId** | [**string**] |  | (optional) defaults to undefined|
| **type** | [**string**] |  | (optional) defaults to undefined|
| **search** | [**string**] |  | (optional) defaults to undefined|


### Return type

**PageTransactionDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Successful response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateTransaction**
> TransactionDTO updateTransaction(transactionCreateDTO)


### Example

```typescript
import {
    TransactionApi,
    Configuration,
    TransactionCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new TransactionApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)
let transactionCreateDTO: TransactionCreateDTO; //

const { status, data } = await apiInstance.updateTransaction(
    workspaceId,
    id,
    transactionCreateDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **transactionCreateDTO** | **TransactionCreateDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**TransactionDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

