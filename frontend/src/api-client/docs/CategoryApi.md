# CategoryApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getCategoryTree**](#getcategorytree) | **GET** /api/v1/categories/tree/{workspaceId} | Get categories as a tree|

# **getCategoryTree**
> Array<CategoryNodeDTO> getCategoryTree()


### Example

```typescript
import {
    CategoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CategoryApi(configuration);

let workspaceId: string; // (default to undefined)
let type: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getCategoryTree(
    workspaceId,
    type
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **type** | [**string**] |  | (optional) defaults to undefined|


### Return type

**Array<CategoryNodeDTO>**

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

