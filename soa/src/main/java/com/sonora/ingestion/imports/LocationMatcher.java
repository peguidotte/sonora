package com.sonora.ingestion.imports;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.sonora.ingestion.domain.GeoDistance;
import com.sonora.ingestion.domain.Location;

/**
 * Associa um ponto público ao local cadastrado mais próximo, somente se estiver a até maxDistance.
 * Nunca desloca coordenadas: pontos sem local próximo são rejeitados e contabilizados.
 */
public class LocationMatcher {
    public record Place(UUID id, double latitude, double longitude) {}

    public record Match(UUID locationId, double distanceMeters) {}

    private final List<Place> places;
    private final double maxDistanceMeters;

    public LocationMatcher(List<Place> places, double maxDistanceMeters) {
        this.places = List.copyOf(places);
        this.maxDistanceMeters = maxDistanceMeters;
    }

    public static LocationMatcher of(List<Location> locations, double maxDistanceMeters) {
        return new LocationMatcher(locations.stream()
                .map(l -> new Place(l.getId(), l.getLatitude(), l.getLongitude())).toList(), maxDistanceMeters);
    }

    public Optional<Match> nearest(double latitude, double longitude) {
        return places.stream()
                .map(p -> new Match(p.id(), GeoDistance.meters(p.latitude(), p.longitude(), latitude, longitude)))
                .filter(match -> match.distanceMeters() <= maxDistanceMeters)
                .min(Comparator.comparingDouble(Match::distanceMeters).thenComparing(Match::locationId));
    }
}
