/*

Differences with Vulcan Meteor:

- use models instead of collections, to stay isomorphic
- do not accept references for models and fragments (eg collectionName), you have to get the actual value beforehand
- no pattern to get settings: you have to pass the polling option each time (or create your own useMulti that extends this one). Defaults can't be overriden globally.
- deprecate "propertyName" => with hooks you can rename when consuming the hook instead
- automated pluralization is forbidden, eg in graphql templates 
=> user has to provide a multiTypeName in the model (could be improved but automated pluralization must be avoided)
*/
/*

### withMulti

Paginated items container

Options: 

  - collection: the collection to fetch the documents from
  - fragment: the fragment that defines which properties to fetch
  - fragmentName: the name of the fragment, passed to getFragment
  - limit: the number of documents to show initially
  - pollInterval: how often the data should be updated, in ms (set to 0 to disable polling)
  - input: the initial query input
    - filter
    - sort
    - search
    - offset
    - limit
         
*/

import {
  useQuery,
  gql,
  QueryResult,
  QueryOptions,
  OperationVariables,
} from "@apollo/client";
import { useState } from "react";
import { multiClientTemplate, VulcanGraphqlModel } from "@vulcanjs/graphql";
import merge from "lodash/merge";
import get from "lodash/get";
import { QueryInput } from "./typings";

// default query input object
const defaultInput = {
  limit: 20,
  enableTotal: true,
  enableCache: false,
};

interface BuildMultiQueryArgs {
  typeName: string;
  multiTypeName: string;
  fragmentName: string;
  fragment: string;
  extraQueries?: string;
}
export const buildMultiQuery = ({
  typeName,
  multiTypeName,
  fragmentName,
  extraQueries,
  fragment,
}: BuildMultiQueryArgs) => gql`
  ${multiClientTemplate({
    typeName,
    multiTypeName,
    fragmentName,
    extraQueries,
  })}
  ${fragment}
`;

const getInitialPaginationInput = (options, props) => {
  // get initial limit from props, or else options, or else default value
  const limit =
    (props.input && props.input.limit) ||
    (options.input && options.input.limit) ||
    options.limit ||
    defaultInput.limit;
  const paginationInput = {
    limit,
  };
  return paginationInput;
};

/**
 * Build the graphQL query options
 * @param {*} options
 * @param {*} state
 * @param {*} props
 */
export const buildMultiQueryOptions = <
  TData = any,
  TVariables = OperationVariables
>(
  options,
  paginationInput: any = {},
  props
): Partial<QueryOptions<TData, TVariables>> => {
  let {
    input: optionsInput,
    pollInterval = 20000,
    // generic graphQL options
    queryOptions = {},
  } = options;

  // get dynamic input from props
  const { input: propsInput = {} } = props;

  // merge static and dynamic inputs
  const input = merge({}, optionsInput, propsInput);

  // if this is the SSR process, set pollInterval to null
  // see https://github.com/apollographql/apollo-client/issues/1704#issuecomment-322995855
  pollInterval = typeof window === "undefined" ? null : pollInterval;

  // get input from options, then props, then pagination
  // TODO: should be done during the merge with lodash
  const mergedInput = {
    ...defaultInput,
    ...options.input,
    ...input,
    ...paginationInput,
  };

  const graphQLOptions = {
    variables: {
      input: mergedInput,
    },
    // note: pollInterval can be set to 0 to disable polling (20s by default)
    pollInterval,
  };

  // see https://www.apollographql.com/docs/react/features/error-handling/#error-policies
  queryOptions.errorPolicy = "all";

  return {
    ...graphQLOptions,
    ...queryOptions, // allow overriding options
  };
};

const buildMultiResult = (
  options,
  { fragmentName, fragment, resolverName },
  { setPaginationInput, paginationInput, initialPaginationInput },
  queryResult: QueryResult
): MultiQueryResult => {
  //console.log('returnedProps', returnedProps);

  // workaround for https://github.com/apollographql/apollo-client/issues/2810
  const graphQLErrors = get(queryResult, "error.networkError.result.errors");
  const { refetch, networkStatus, error, fetchMore, data } = queryResult;
  // Note: Scalar types like Dates are NOT converted. It should be done at the UI level.
  const results = data && data[resolverName] && data[resolverName].results;
  const totalCount =
    data && data[resolverName] && data[resolverName].totalCount;
  // see https://github.com/apollographql/apollo-client/blob/master/packages/apollo-client/src/core/networkStatus.ts
  const loadingInitial = networkStatus === 1;
  const loading = networkStatus === 1;
  const loadingMore = networkStatus === 3 || networkStatus === 2;

  if (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }

  return {
    ...queryResult,
    // see https://github.com/apollostack/apollo-client/blob/master/src/queries/store.ts#L28-L36
    // note: loading will propably change soon https://github.com/apollostack/apollo-client/issues/831
    loadingInitial,
    loadingMore,
    results,
    totalCount,
    networkError: error && error.networkError,
    graphQLErrors,
    count: results && results.length,

    // regular load more (reload everything)
    loadMore(providedInput) {
      // if new terms are provided by presentational component use them, else default to incrementing current limit once
      const newInput = providedInput || {
        ...paginationInput,
        limit: results.length + initialPaginationInput.limit,
      };
      setPaginationInput(newInput);
    },

    // incremental loading version (only load new content)
    // note: not compatible with polling
    // TODO
    loadMoreInc(providedInput) {
      // get terms passed as argument or else just default to incrementing the offset

      const newInput = providedInput || {
        ...paginationInput,
        offset: results.length,
      };

      return fetchMore({
        variables: { input: newInput },
        updateQuery(previousResults, { fetchMoreResult }) {
          // no more post to fetch
          if (
            !(
              fetchMoreResult[resolverName] &&
              fetchMoreResult[resolverName].results &&
              fetchMoreResult[resolverName].results.length
            )
          ) {
            return previousResults;
          }
          const newResults = {
            ...previousResults,
            [resolverName]: { ...previousResults[resolverName] },
          }; // TODO: should we clone this object? => yes
          newResults[resolverName].results = [
            ...previousResults[resolverName].results,
            ...fetchMoreResult[resolverName].results,
          ];
          return newResults;
        },
      });
    },

    fragmentName,
    fragment,
    data,
  };
};

interface MultiInput extends QueryInput {}

interface UseMultiOptions {
  model: VulcanGraphqlModel;
  input?: MultiInput;
  fragment?: string;
  fragmentName?: string;
  extraQueries?: string; // Get more data alongside the objects
} // & useQuery options?
interface MultiQueryResult<TData = any> extends QueryResult<TData> {
  graphQLErrors: any;
  loadingInitial: boolean;
  loadingMore: boolean;
  loadMore: Function;
  loadMoreInc: Function;
  results?: Array<TData>;
  totalCount?: number;
  count?: number;
  networkError?: any;
  graphqlErrors?: Array<any>;
  fragment: string;
  fragmentName: string;
}

export const useMulti = (options: UseMultiOptions, props = {}) => {
  const initialPaginationInput = getInitialPaginationInput(options, props);
  const [paginationInput, setPaginationInput] = useState(
    initialPaginationInput
  );

  let {
    model,
    fragment = model.graphql.defaultFragment,
    fragmentName = model.graphql.defaultFragmentName,
    extraQueries,
  } = options;

  //const { collectionName, collection } = extractCollectionInfo(options);
  //const { fragmentName, fragment } = extractFragmentInfo(
  //  options,
  //  collectionName
  //);

  const {
    typeName,
    multiTypeName,
    multiResolverName: resolverName,
  } = model.graphql;

  // build graphql query from options
  const query = buildMultiQuery({
    typeName,
    multiTypeName,
    fragmentName,
    extraQueries,
    fragment,
  });

  const queryOptions = buildMultiQueryOptions(options, paginationInput, props);
  const queryResult: QueryResult = useQuery(query, queryOptions);

  const result = buildMultiResult(
    options,
    { fragment, fragmentName, resolverName },
    { setPaginationInput, paginationInput, initialPaginationInput },
    queryResult
  );

  return result;
};
