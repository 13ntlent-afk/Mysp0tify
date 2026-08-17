/*
 * Application Insights (Azure Monitor) web SDK bootstrap.
 * Loads the SDK from Microsoft's CDN then tracks page views, browser/device
 * info, and geo-location (derived server-side from the visitor's IP) for
 * every page load. Feeds appi-spotify-web -> law-spotify-web -> Microsoft
 * Sentinel, answering "who is using the app and where it's accessed from".
 */
(function () {
	var CONNECTION_STRING =
		"InstrumentationKey=857c4598-210d-4cd3-9cb1-46e2dbf3cf04;IngestionEndpoint=https://southeastasia-1.in.applicationinsights.azure.com/;LiveEndpoint=https://southeastasia.livediagnostics.monitor.azure.com/;ApplicationId=1d3e88db-4c96-4770-b86f-fc78a8e81e7e";

	var script = document.createElement("script");
	script.src = "https://js.monitor.azure.com/scripts/b/ai.2.min.js";
	script.crossOrigin = "anonymous";
	script.onload = function () {
		try {
			var appInsights = new Microsoft.ApplicationInsights.ApplicationInsights({
				config: {
					connectionString: CONNECTION_STRING,
					enableAutoRouteTracking: true,
					disableFetchTracking: false,
				},
			});
			appInsights.loadAppInsights();
			appInsights.trackPageView();
			window.appInsights = appInsights;
		} catch (err) {
			// Fail silently -- telemetry must never break the site for visitors.
		}
	};
	document.head.appendChild(script);
})();
