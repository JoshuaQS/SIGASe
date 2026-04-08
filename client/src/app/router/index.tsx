import { useRoutes } from 'react-router-dom';
import { routes } from './route-config';

export default function AppRouter() {
  return useRoutes(routes);
}
