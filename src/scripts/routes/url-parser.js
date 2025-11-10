function extractPathnameSegments(path) {
  const splitUrl = path.split('/').filter(segment => segment !== '');

  return {
    resource: splitUrl[0] || null,
    id: splitUrl[1] || null,
  };
}

function constructRouteFromSegments(pathSegments) {
  let pathname = '';

  if (pathSegments.resource) {
    pathname = pathname.concat(`/${pathSegments.resource}`);
  }

  if (pathSegments.id) {
    pathname = pathname.concat('/:id');
  }

  return pathname || '/';
}

export function getActivePathname() {
  const hash = window.location.hash.slice(1).toLowerCase();
  return hash || '/';
}

export function getActiveRoute() {
  const path = getActivePathname();
  const segments = extractPathnameSegments(path);
  return constructRouteFromSegments(segments);
}

export function parseActivePathname() {
  const pathname = getActivePathname();
  return extractPathnameSegments(pathname);
}

export function getRoute(pathname) {
  const urlSegments = extractPathnameSegments(pathname);
  return constructRouteFromSegments(urlSegments);
}

export function parsePathname(pathname) {
  return extractPathnameSegments(pathname);
}