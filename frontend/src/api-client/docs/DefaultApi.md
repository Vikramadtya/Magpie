# DefaultApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createAccount**](#createaccount) | **POST** /api/v1/accounts/{workspaceId} | |
|[**createBudget**](#createbudget) | **POST** /api/v1/budgets/{workspaceId} | |
|[**createGoal**](#creategoal) | **POST** /api/v1/goals/{workspaceId} | |
|[**createSubscription**](#createsubscription) | **POST** /api/v1/subscriptions/{workspaceId} | |
|[**createTransaction**](#createtransaction) | **POST** /api/v1/transactions/{workspaceId} | |
|[**deleteAccount**](#deleteaccount) | **DELETE** /api/v1/accounts/{workspaceId}/{accountId} | |
|[**deleteBudget**](#deletebudget) | **DELETE** /api/v1/budgets/{workspaceId}/{budgetId} | |
|[**deleteGoal**](#deletegoal) | **DELETE** /api/v1/goals/{workspaceId}/{goalId} | |
|[**deleteSubscription**](#deletesubscription) | **DELETE** /api/v1/subscriptions/{workspaceId}/{subscriptionId} | |
|[**deleteTransaction**](#deletetransaction) | **DELETE** /api/v1/transactions/{workspaceId}/{transactionId} | |
|[**fundGoal**](#fundgoal) | **POST** /api/v1/goals/{workspaceId}/{goalId}/fund | |
|[**getAllAccounts**](#getallaccounts) | **GET** /api/v1/accounts/{workspaceId} | |
|[**getAllTransactions**](#getalltransactions) | **GET** /api/v1/transactions/{workspaceId} | |
|[**getBudgets**](#getbudgets) | **GET** /api/v1/budgets/{workspaceId} | |
|[**getDashboard**](#getdashboard) | **GET** /api/analytics/dashboard | |
|[**getGoals**](#getgoals) | **GET** /api/v1/goals/{workspaceId} | |
|[**getSubscriptions**](#getsubscriptions) | **GET** /api/v1/subscriptions/{workspaceId} | |
|[**updateAccount**](#updateaccount) | **PUT** /api/v1/accounts/{workspaceId}/{accountId} | |
|[**updateBudget**](#updatebudget) | **PUT** /api/v1/budgets/{workspaceId}/{budgetId} | |
|[**updateGoal**](#updategoal) | **PUT** /api/v1/goals/{workspaceId}/{goalId} | |
|[**updateSubscription**](#updatesubscription) | **PUT** /api/v1/subscriptions/{workspaceId}/{subscriptionId} | |
|[**updateTransaction**](#updatetransaction) | **PUT** /api/v1/transactions/{workspaceId}/{transactionId} | |

# **createAccount**
> Account createAccount(account)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    Account
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let account: Account; //

const { status, data } = await apiInstance.createAccount(
    workspaceId,
    account
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **account** | **Account**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**Account**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | createAccount 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createBudget**
> BudgetControllerBudgetDTO createBudget(createBudgetDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateBudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let createBudgetDTO: CreateBudgetDTO; //

const { status, data } = await apiInstance.createBudget(
    workspaceId,
    createBudgetDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createBudgetDTO** | **CreateBudgetDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**BudgetControllerBudgetDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | createBudget 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createGoal**
> GoalControllerGoalDTO createGoal(createGoalDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateGoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let createGoalDTO: CreateGoalDTO; //

const { status, data } = await apiInstance.createGoal(
    workspaceId,
    createGoalDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createGoalDTO** | **CreateGoalDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**GoalControllerGoalDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | createGoal 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createSubscription**
> SubscriptionControllerSubscriptionDTO createSubscription(createSubscriptionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateSubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let createSubscriptionDTO: CreateSubscriptionDTO; //

const { status, data } = await apiInstance.createSubscription(
    workspaceId,
    createSubscriptionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createSubscriptionDTO** | **CreateSubscriptionDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**SubscriptionControllerSubscriptionDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | createSubscription 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createTransaction**
> TransactionDTO createTransaction(createTransactionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateTransactionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let createTransactionDTO: CreateTransactionDTO; //

const { status, data } = await apiInstance.createTransaction(
    workspaceId,
    createTransactionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createTransactionDTO** | **CreateTransactionDTO**|  | |
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
|**200** | createTransaction 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteAccount**
> object deleteAccount()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let accountId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteAccount(
    workspaceId,
    accountId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **accountId** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | deleteAccount 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteBudget**
> object deleteBudget()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let budgetId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteBudget(
    workspaceId,
    budgetId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **budgetId** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | deleteBudget 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteGoal**
> object deleteGoal()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let goalId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteGoal(
    workspaceId,
    goalId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **goalId** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | deleteGoal 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteSubscription**
> object deleteSubscription()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let subscriptionId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteSubscription(
    workspaceId,
    subscriptionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **subscriptionId** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | deleteSubscription 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteTransaction**
> object deleteTransaction()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let transactionId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteTransaction(
    workspaceId,
    transactionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|
| **transactionId** | [**string**] |  | defaults to undefined|


### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | deleteTransaction 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **fundGoal**
> GoalControllerGoalDTO fundGoal(requestBody)


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let goalId: string; // (default to undefined)
let requestBody: { [key: string]: number; }; //

const { status, data } = await apiInstance.fundGoal(
    workspaceId,
    goalId,
    requestBody
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **requestBody** | **{ [key: string]: number; }**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **goalId** | [**string**] |  | defaults to undefined|


### Return type

**GoalControllerGoalDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | fundGoal 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAllAccounts**
> Array<Account> getAllAccounts()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getAllAccounts(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] |  | defaults to undefined|


### Return type

**Array<Account>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | getAllAccounts 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getAllTransactions**
> Array<TransactionDTO> getAllTransactions()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)

const { status, data } = await apiInstance.getAllTransactions(
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
|**200** | getAllTransactions 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBudgets**
> Array<BudgetControllerBudgetDTO> getBudgets()


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

**Array<BudgetControllerBudgetDTO>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | getBudgets 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDashboard**
> { [key: string]: any; } getDashboard()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let months: number; // (default to 12)

const { status, data } = await apiInstance.getDashboard(
    months
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **months** | [**number**] |  | defaults to 12|


### Return type

**{ [key: string]: any; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | getDashboard 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getGoals**
> Array<GoalControllerGoalDTO> getGoals()


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

**Array<GoalControllerGoalDTO>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | getGoals 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSubscriptions**
> Array<SubscriptionControllerSubscriptionDTO> getSubscriptions()


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

**Array<SubscriptionControllerSubscriptionDTO>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | getSubscriptions 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateAccount**
> Account updateAccount(account)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    Account
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let accountId: string; // (default to undefined)
let account: Account; //

const { status, data } = await apiInstance.updateAccount(
    workspaceId,
    accountId,
    account
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **account** | **Account**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **accountId** | [**string**] |  | defaults to undefined|


### Return type

**Account**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | updateAccount 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateBudget**
> BudgetControllerBudgetDTO updateBudget(createBudgetDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateBudgetDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let budgetId: string; // (default to undefined)
let createBudgetDTO: CreateBudgetDTO; //

const { status, data } = await apiInstance.updateBudget(
    workspaceId,
    budgetId,
    createBudgetDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createBudgetDTO** | **CreateBudgetDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **budgetId** | [**string**] |  | defaults to undefined|


### Return type

**BudgetControllerBudgetDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | updateBudget 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateGoal**
> GoalControllerGoalDTO updateGoal(createGoalDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateGoalDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let goalId: string; // (default to undefined)
let createGoalDTO: CreateGoalDTO; //

const { status, data } = await apiInstance.updateGoal(
    workspaceId,
    goalId,
    createGoalDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createGoalDTO** | **CreateGoalDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **goalId** | [**string**] |  | defaults to undefined|


### Return type

**GoalControllerGoalDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | updateGoal 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateSubscription**
> SubscriptionControllerSubscriptionDTO updateSubscription(createSubscriptionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateSubscriptionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let subscriptionId: string; // (default to undefined)
let createSubscriptionDTO: CreateSubscriptionDTO; //

const { status, data } = await apiInstance.updateSubscription(
    workspaceId,
    subscriptionId,
    createSubscriptionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createSubscriptionDTO** | **CreateSubscriptionDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **subscriptionId** | [**string**] |  | defaults to undefined|


### Return type

**SubscriptionControllerSubscriptionDTO**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | updateSubscription 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateTransaction**
> TransactionDTO updateTransaction(createTransactionDTO)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    CreateTransactionDTO
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let workspaceId: string; // (default to undefined)
let transactionId: string; // (default to undefined)
let createTransactionDTO: CreateTransactionDTO; //

const { status, data } = await apiInstance.updateTransaction(
    workspaceId,
    transactionId,
    createTransactionDTO
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createTransactionDTO** | **CreateTransactionDTO**|  | |
| **workspaceId** | [**string**] |  | defaults to undefined|
| **transactionId** | [**string**] |  | defaults to undefined|


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
|**200** | updateTransaction 200 response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

