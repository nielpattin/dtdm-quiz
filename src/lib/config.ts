export const APP_VERSION = '1.5.0';
export const checkAppVersion = (): boolean => {
	const storedVersion = localStorage.getItem('app_version');
	return storedVersion === APP_VERSION;
};
