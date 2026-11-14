namespace Sonora.Api.Domain;

/// <summary>Coordenada WGS84. Distância pela fórmula de haversine (suficiente para raios até 1 km).</summary>
public readonly record struct GeoPoint
{
    private const double EarthRadiusMeters = 6_371_008.8;
    private const double MetersPerDegreeLatitude = 111_320;

    public GeoPoint(double latitude, double longitude)
    {
        if (!double.IsFinite(latitude) || latitude is < -90 or > 90)
            throw new ArgumentOutOfRangeException(nameof(latitude));
        if (!double.IsFinite(longitude) || longitude is < -180 or > 180)
            throw new ArgumentOutOfRangeException(nameof(longitude));
        Latitude = latitude;
        Longitude = longitude;
    }

    public double Latitude { get; }
    public double Longitude { get; }

    public double DistanceMetersTo(GeoPoint other)
    {
        static double Radians(double degrees) => degrees * Math.PI / 180;
        var dLat = Radians(other.Latitude - Latitude);
        var dLon = Radians(other.Longitude - Longitude);
        var a = Math.Pow(Math.Sin(dLat / 2), 2)
              + Math.Cos(Radians(Latitude)) * Math.Cos(Radians(other.Latitude)) * Math.Pow(Math.Sin(dLon / 2), 2);
        return 2 * EarthRadiusMeters * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    /// <summary>
    /// Retângulo que contém o círculo; serve só como pré-filtro indexável no banco.
    /// A distância exata é conferida depois com haversine.
    /// </summary>
    public GeoBox BoundingBox(double radiusMeters)
    {
        var latDelta = radiusMeters / MetersPerDegreeLatitude * 1.01;
        var cos = Math.Cos(Latitude * Math.PI / 180);
        var lonDelta = cos < 1e-6 ? 180 : Math.Min(180, radiusMeters / (MetersPerDegreeLatitude * cos) * 1.01);
        return new GeoBox(Math.Max(-90, Latitude - latDelta), Math.Min(90, Latitude + latDelta),
            Longitude - lonDelta, Longitude + lonDelta);
    }
}

/// <summary>
/// Retângulo de busca. Longitudes podem passar de ±180 perto do antimeridiano;
/// <see cref="CrossesAntimeridian"/> sinaliza esse caso para o filtro.
/// </summary>
public readonly record struct GeoBox(double MinLatitude, double MaxLatitude, double MinLongitude, double MaxLongitude)
{
    public bool CrossesAntimeridian => MinLongitude < -180 || MaxLongitude > 180;
}
