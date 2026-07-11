import { Transaction } from '../services/api';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Assets: undefined;
  Transactions: undefined;
  Insights: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  AddTransaction: { transaction?: Transaction; accountId?: string };
  AccountDetail: { accountId: string };
  ManageAccounts: undefined;
  Transfer: undefined;
};
