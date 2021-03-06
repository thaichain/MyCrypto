import find from 'ramda/src/find';
import allPass from 'ramda/src/allPass';
import propEq from 'ramda/src/propEq';
import values from 'ramda/src/values';
import curry from 'ramda/src/curry';
import prop from 'ramda/src/prop';
import uniq from 'ramda/src/uniq';
import map from 'ramda/src/map';

import {
  LocalStorage,
  Asset,
  TUuid,
  IAccount,
  TTicker,
  NetworkId,
  AssetBalanceObject
} from '@types';

// Migration from v0.0.1 to v1.0.0
// We can expect the previous values to be valid, so we only need to address
// the difference.

export function migrate(prev: LocalStorage, curr: LocalStorage) {
  // Update asset uuids
  const getAssetByTickerAndNetworkID = (
    assets: Record<TUuid, Asset>,
    networkId: NetworkId,
    ticker: TTicker
  ) => find(allPass([propEq('ticker', ticker), propEq('networkId', networkId)]), values(assets));

  const updateAccountAssetsUUID = ({ networkId, assets = [], ...rest }: IAccount) => {
    const getTicker = (uuid: TUuid) => {
      //@ts-ignore
      const asset = prev.assets[uuid] || {};
      return asset && asset.ticker ? asset.ticker : undefined;
    };
    const getUUID = (ticker: TTicker) => {
      const asset = curry(getAssetByTickerAndNetworkID)(curr.assets)(networkId)(ticker);
      //@ts-ignore
      return prop('uuid', asset);
    };

    const updateUUID = (assetBalance: AssetBalanceObject) => ({
      ...assetBalance,
      //@ts-ignore
      uuid: getUUID(getTicker(assetBalance.uuid))
    });

    return {
      ...rest,
      networkId,
      assets: map(updateUUID, assets)
    };
  };

  // Merge accounts
  const accounts = Object.assign(
    {},
    curr.accounts,
    map(updateAccountAssetsUUID, (prev.accounts as R.Functor<IAccount>) || {})
  );

  // Add labels to address book
  const { dashboardAccounts = [] } = prev.settings;
  //@ts-ignore
  const accountUUIDs = map(prop('uuid'), values(accounts));

  const settings = {
    ...curr.settings,
    dashboardAccounts: uniq([...accountUUIDs, ...dashboardAccounts]).filter(Boolean)
  };

  return Object.assign({}, curr, { accounts, settings });
}
