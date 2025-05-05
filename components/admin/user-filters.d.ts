import { UserSearchParams } from '@/types/admin-types';

export interface UserFiltersProps {
  currentFilters: Partial<UserSearchParams>;
}

export function UserFilters(props: UserFiltersProps): JSX.Element;
