# GoalApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createGoal**](#creategoal) | **POST** /api/v1/goals/{workspaceId} | Create goal|
|[**deleteGoal**](#deletegoal) | **DELETE** /api/v1/goals/{workspaceId}/{id} | Delete goal|
|[**getGoals**](#getgoals) | **GET** /api/v1/goals/{workspaceId} | Get goals|
|[**updateGoal**](#updategoal) | **PUT** /api/v1/goals/{workspaceId}/{id} | Update goal|

# **createGoal**
> GoalDTO createGoal(goalDTO)


### Example

```typescript
import {
    GoalApi,
    Configuration,
    GoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new GoalApi(configuration);

let workspaceId: string; // (default to undefined)
let goalDTO: GoalDTO; //

const { status, data } = await apiInstance.createGoal(
    workspaceId,
    goalDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **goalDTO** | **GoalDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**GoalDTO**

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

# **deleteGoal**
> deleteGoal()


### Example

```typescript
import {
    GoalApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new GoalApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)

const { status, data } = await apiInstance.deleteGoal(
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

# **getGoals**
> Array<GoalDTO> getGoals()


### Example

```typescript
import {
    GoalApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new GoalApi(configuration);

let workspaceId: string; // (default to undefined)
let status: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getGoals(
    workspaceId,
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **status** | [**string**] |  | (optional) defaults to undefined|


### Return type

**Array<GoalDTO>**

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

# **updateGoal**
> GoalDTO updateGoal(goalDTO)


### Example

```typescript
import {
    GoalApi,
    Configuration,
    GoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new GoalApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)
let goalDTO: GoalDTO; //

const { status, data } = await apiInstance.updateGoal(
    workspaceId,
    id,
    goalDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **goalDTO** | **GoalDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**GoalDTO**

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

