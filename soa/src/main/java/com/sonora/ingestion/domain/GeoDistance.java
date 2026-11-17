package com.sonora.ingestion.domain;

/** Haversine sobre esfera de raio médio; erro desprezível para o critério de até 50 m. */
public final class GeoDistance {
    static final double EARTH_MEAN_RADIUS_METERS = 6_371_008.8;

    private GeoDistance() {}

    public static double meters(double latitudeA, double longitudeA, double latitudeB, double longitudeB) {
        double phiA = Math.toRadians(latitudeA);
        double phiB = Math.toRadians(latitudeB);
        double deltaPhi = phiB - phiA;
        double deltaLambda = Math.toRadians(longitudeB - longitudeA);
        double h = Math.pow(Math.sin(deltaPhi / 2), 2)
                + Math.cos(phiA) * Math.cos(phiB) * Math.pow(Math.sin(deltaLambda / 2), 2);
        return 2 * EARTH_MEAN_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    public static boolean validCoordinate(double latitude, double longitude) {
        return Double.isFinite(latitude) && Double.isFinite(longitude)
                && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }
}
