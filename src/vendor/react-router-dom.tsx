import type { AnchorHTMLAttributes, ReactNode } from 'react';
import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Location = {
  pathname: string;
};

type NavigateOptions = {
  replace?: boolean;
};

type RouterContextValue = {
  location: Location;
  navigate: (to: string, options?: NavigateOptions) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

const normalizePath = (value: string) => {
  if (!value) return '/';
  if (value.length > 1 && value.endsWith('/')) {
    return value.replace(/\/+$/, '');
  }
  return value;
};

const getCurrentPath = (): string => {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return '/';
  }
  const { pathname, search, hash } = window.location;
  return normalizePath(`${pathname}${search}${hash}` || '/');
};

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState<string>(() => getCurrentPath());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }
    const handlePop = () => {
      setPathname(getCurrentPath());
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = useCallback(
    (to: string, options: NavigateOptions = {}) => {
      const target = normalizePath(to);
      if (typeof window === 'undefined') {
        setPathname(target);
        return;
      }
      if (options.replace) {
        window.history.replaceState({}, '', target);
      } else {
        window.history.pushState({}, '', target);
      }
      setPathname(getCurrentPath());
    },
    []
  );

  const value = useMemo<RouterContextValue>(
    () => ({
      location: { pathname },
      navigate,
    }),
    [navigate, pathname]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useLocation(): Location {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useLocation must be used within a BrowserRouter');
  }
  return context.location;
}

export function useNavigate(): RouterContextValue['navigate'] {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within a BrowserRouter');
  }
  return context.navigate;
}

type NavLinkRenderProps = {
  isActive: boolean;
};

type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  children: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
  className?: string;
  activeClassName?: string;
  end?: boolean;
};

export function NavLink({
  to,
  children,
  className,
  activeClassName,
  end = false,
  onClick,
  ...rest
}: NavLinkProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const target = normalizePath(to);
  const current = normalizePath(location.pathname);
  const isActive = end ? current === target : current === target || current.startsWith(`${target}/`);
  const finalClassName = [className, isActive ? activeClassName ?? 'active' : null]
    .filter(Boolean)
    .join(' ');

  const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>['onClick'] = event => {
    if (onClick) {
      onClick(event);
    }
    if (event.defaultPrevented) return;
    event.preventDefault();
    navigate(target);
  };

  const content = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <a
      {...rest}
      href={target}
      onClick={handleClick}
      className={finalClassName || undefined}
      aria-current={isActive ? 'page' : undefined}
    >
      {content}
    </a>
  );
}

type RouteElement = {
  path?: string;
  element: ReactNode;
};

type RouteProps = RouteElement & {
  children?: ReactNode;
};

export function Route(_props: RouteProps) {
  return null;
}

const matchPath = (path: string | undefined, current: string) => {
  if (!path || path === '*') return true;
  const normalizedPath = normalizePath(path);
  if (normalizedPath === current) return true;
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/*')) {
    const prefix = normalizedPath.slice(0, -2);
    return current === prefix || current.startsWith(`${prefix}/`);
  }
  return false;
};

type RoutesProps = {
  children?: ReactNode;
};

export function Routes({ children }: RoutesProps) {
  const location = useLocation();
  let element: ReactNode = null;

  Children.forEach(children, child => {
    if (element !== null) return;
    if (!isValidElement<RouteProps>(child)) return;
    const props = child.props;
    if (matchPath(props.path, location.pathname)) {
      element = props.element ?? null;
      if (props.children) {
        element = cloneElement(<Fragment>{element}</Fragment>, {}, props.children);
      }
    }
  });

  return <>{element}</>;
}

export function Outlet() {
  return null;
}
