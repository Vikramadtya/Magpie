# SubscriptionApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createSubscription**](#createsubscription) | **POST** /api/v1/subscriptions/{workspaceId} | Create subscription|
|[**deleteSubscription**](#deletesubscription) | **DELETE** /api/v1/subscriptions/{workspaceId}/{id} | Delete subscription|
|[**getSubscriptions**](#getsubscriptions) | **GET** /api/v1/subscriptions/{workspaceId} | Get subscriptions|
|[**updateSubscription**](#updatesubscription) | **PUT** /api/v1/subscriptions/{workspaceId}/{id} | Update subscription|

# **createSubscription**
> SubscriptionDTO createSubscription(subscriptionDTO)


### Example

```typescript
import {
    SubscriptionApi,
    Configuration,
    SubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new SubscriptionApi(configuration);

let workspaceId: string; // (default to undefined)
let subscriptionDTO: SubscriptionDTO; //

const { status, data } = await apiInstance.createSubscription(
    workspaceId,
    subscriptionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **subscriptionDTO** | **SubscriptionDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**SubscriptionDTO**

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

# **deleteSubscription**
> deleteSubscription()


### Example

```typescript
import {
    SubscriptionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SubscriptionApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)

const { status, data } = await apiInstance.deleteSubscription(
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

# **getSubscriptions**
> Array<SubscriptionDTO> getSubscriptions()


### Example

```typescript
import {
    SubscriptionApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SubscriptionApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getSubscriptions(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**Array<SubscriptionDTO>**

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

# **updateSubscription**
> SubscriptionDTO updateSubscription(subscriptionDTO)


### Example

```typescript
import {
    SubscriptionApi,
    Configuration,
    SubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new SubscriptionApi(configuration);

let workspaceId: string; // (default to undefined)
let id: string; // (default to undefined)
let subscriptionDTO: SubscriptionDTO; //

const { status, data } = await apiInstance.updateSubscription(
    workspaceId,
    id,
    subscriptionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **subscriptionDTO** | **SubscriptionDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**SubscriptionDTO**

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

