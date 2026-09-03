# BudgetApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createBudget**](#createbudget) | **POST** /api/v1/budgets/{workspaceId} | Create budget|
|[**deleteBudget**](#deletebudget) | **DELETE** /api/v1/budgets/{workspaceId}/{id} | Delete budget|
|[**getBudgetSummary**](#getbudgetsummary) | **GET** /api/v1/budgets/summary/{workspaceId} | Get budget summary|
|[**getBudgets**](#getbudgets) | **GET** /api/v1/budgets/{workspaceId} | Get budgets|
|[**updateBudget**](#updatebudget) | **PUT** /api/v1/budgets/{workspaceId}/{id} | Update budget|

# **createBudget**
> BudgetDTO createBudget(budgetDTO)


### Example

```typescript
import {
    BudgetApi,
    Configuration,
    BudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new BudgetApi(configuration);

let workspaceId: string; // (default to undefined)
let budgetDTO: BudgetDTO; //

const { status, data } = await apiInstance.createBudget(
    workspaceId,
    budgetDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **budgetDTO** | **BudgetDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**BudgetDTO**

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

# **deleteBudget**
> deleteBudget()


### Example

```typescript
import {
    BudgetApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new BudgetApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)

const { status, data } = await apiInstance.deleteBudget(
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

# **getBudgetSummary**
> BudgetSummaryDTO getBudgetSummary()


### Example

```typescript
import {
    BudgetApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new BudgetApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getBudgetSummary(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**BudgetSummaryDTO**

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

# **getBudgets**
> Array<BudgetDTO> getBudgets()


### Example

```typescript
import {
    BudgetApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new BudgetApi(configuration);

let workspaceId: string; // (default to undefined)
let period: string; // (optional) (default to undefined)
let categoryId: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getBudgets(
    workspaceId,
    period,
    categoryId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **period** | [**string**] |  | (optional) defaults to undefined|
| **categoryId** | [**string**] |  | (optional) defaults to undefined|


### Return type

**Array<BudgetDTO>**

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

# **updateBudget**
> BudgetDTO updateBudget(budgetDTO)


### Example

```typescript
import {
    BudgetApi,
    Configuration,
    BudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new BudgetApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)
let budgetDTO: BudgetDTO; //

const { status, data } = await apiInstance.updateBudget(
    workspaceId,
    id,
    budgetDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **budgetDTO** | **BudgetDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**BudgetDTO**

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

