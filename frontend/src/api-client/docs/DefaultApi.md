# DefaultApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createAccount**](#createaccount) | **POST** /api/v1/accounts/{workspaceId} | Create a new account|
|[**createBudget**](#createbudget) | **POST** /api/v1/budgets/{workspaceId} | Create budget|
|[**createGoal**](#creategoal) | **POST** /api/v1/goals/{workspaceId} | Create goal|
|[**createSubscription**](#createsubscription) | **POST** /api/v1/subscriptions/{workspaceId} | Create subscription|
|[**createTransaction**](#createtransaction) | **POST** /api/v1/transactions/{workspaceId} | Create a transaction|
|[**deleteAccount**](#deleteaccount) | **DELETE** /api/v1/accounts/{workspaceId}/{id} | Delete an account|
|[**deleteBudget**](#deletebudget) | **DELETE** /api/v1/budgets/{workspaceId}/{id} | Delete budget|
|[**deleteGoal**](#deletegoal) | **DELETE** /api/v1/goals/{workspaceId}/{id} | Delete goal|
|[**deleteSubscription**](#deletesubscription) | **DELETE** /api/v1/subscriptions/{workspaceId}/{id} | Delete subscription|
|[**deleteTransaction**](#deletetransaction) | **DELETE** /api/v1/transactions/{workspaceId}/{id} | Delete a transaction|
|[**getAccounts**](#getaccounts) | **GET** /api/v1/accounts/{workspaceId} | Get all accounts for a workspace|
|[**getBudgets**](#getbudgets) | **GET** /api/v1/budgets/{workspaceId} | Get budgets|
|[**getDashboard**](#getdashboard) | **GET** /api/analytics/dashboard | Get dashboard data|
|[**getGoals**](#getgoals) | **GET** /api/v1/goals/{workspaceId} | Get goals|
|[**getPayees**](#getpayees) | **GET** /api/v1/payees/{workspaceId} | Get payees|
|[**getSubscriptions**](#getsubscriptions) | **GET** /api/v1/subscriptions/{workspaceId} | Get subscriptions|
|[**getTransactions**](#gettransactions) | **GET** /api/v1/transactions/{workspaceId} | Get transactions|
|[**updateAccount**](#updateaccount) | **PUT** /api/v1/accounts/{workspaceId}/{id} | Update an account|
|[**updateBudget**](#updatebudget) | **PUT** /api/v1/budgets/{workspaceId}/{id} | Update budget|
|[**updateGoal**](#updategoal) | **PUT** /api/v1/goals/{workspaceId}/{id} | Update goal|
|[**updateSubscription**](#updatesubscription) | **PUT** /api/v1/subscriptions/{workspaceId}/{id} | Update subscription|
|[**updateTransaction**](#updatetransaction) | **PUT** /api/v1/transactions/{workspaceId}/{id} | Update a transaction|

# **createAccount**
> AccountDTO createAccount(accountCreateDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    AccountCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **createBudget**
> BudgetDTO createBudget(budgetDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    BudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **createGoal**
> GoalDTO createGoal(goalDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **createSubscription**
> SubscriptionDTO createSubscription(subscriptionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **createTransaction**
> TransactionDTO createTransaction(transactionCreateDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    TransactionCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **deleteAccount**
> deleteAccount()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **deleteBudget**
> deleteBudget()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **deleteGoal**
> deleteGoal()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **deleteSubscription**
> deleteSubscription()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **deleteTransaction**
> deleteTransaction()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **getAccounts**
> Array<AccountDTO> getAccounts()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getAccounts(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


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

# **getBudgets**
> Array<BudgetDTO> getBudgets()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getBudgets(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


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

# **getDashboard**
> DashboardDataDTO getDashboard()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getDashboard(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**DashboardDataDTO**

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

# **getGoals**
> Array<GoalDTO> getGoals()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getGoals(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


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

# **getPayees**
> Array<PayeeDTO> getPayees()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getPayees(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**Array<PayeeDTO>**

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

# **getSubscriptions**
> Array<SubscriptionDTO> getSubscriptions()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **getTransactions**
> Array<TransactionDTO> getTransactions()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getTransactions(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**Array<TransactionDTO>**

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
    DefaultApi,
    Configuration,
    AccountDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **updateBudget**
> BudgetDTO updateBudget(budgetDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    BudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **updateGoal**
> GoalDTO updateGoal(goalDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    GoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **updateSubscription**
> SubscriptionDTO updateSubscription(subscriptionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

# **updateTransaction**
> TransactionDTO updateTransaction(transactionCreateDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    TransactionCreateDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

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

