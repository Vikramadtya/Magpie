# AccountApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createAccount**](#createaccount) | **POST** /api/v1/accounts/{workspaceId} | Create a new account|
|[**deleteAccount**](#deleteaccount) | **DELETE** /api/v1/accounts/{workspaceId}/{id} | Delete an account|
|[**getAccounts**](#getaccounts) | **GET** /api/v1/accounts/{workspaceId} | Get all accounts for a workspace|
|[**updateAccount**](#updateaccount) | **PUT** /api/v1/accounts/{workspaceId}/{id} | Update an account|

# **createAccount**
> AccountDTO createAccount(accountCreateDTO)


### Example

```typescript
import {
    AccountApi,
    Configuration,
    AccountCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new AccountApi(configuration);

let workspaceId: string; // (default to undefined)
let accountCreateDTO: AccountCreateDTO; //

const { status, data } = await apiInstance.createAccount(
    workspaceId,
    accountCreateDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **accountCreateDTO** | **AccountCreateDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**AccountDTO**

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

# **deleteAccount**
> deleteAccount()


### Example

```typescript
import {
    AccountApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AccountApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)

const { status, data } = await apiInstance.deleteAccount(
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
|**204** | No Content |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAccounts**
> Array<AccountDTO> getAccounts()


### Example

```typescript
import {
    AccountApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AccountApi(configuration);

let workspaceId: string; // (default to undefined)
let type: string; // (optional) (default to undefined)
let status: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getAccounts(
    workspaceId,
    type,
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **type** | [**string**] |  | (optional) defaults to undefined|
| **status** | [**string**] |  | (optional) defaults to undefined|


### Return type

**Array<AccountDTO>**

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

# **updateAccount**
> AccountDTO updateAccount(accountDTO)


### Example

```typescript
import {
    AccountApi,
    Configuration,
    AccountDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new AccountApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)
let accountDTO: AccountDTO; //

const { status, data } = await apiInstance.updateAccount(
    workspaceId,
    id,
    accountDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **accountDTO** | **AccountDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**AccountDTO**

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

