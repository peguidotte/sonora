package com.sonora.ingestion.domain;

import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** Local cadastrado. Observações públicas só são associadas por critério geográfico explícito. */
@Entity
@Immutable
@Table(name = "locations")
public class Location {
    @Id
    private UUID id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false)
    private String city;
    @Column(nullable = false)
    private double latitude;
    @Column(nullable = false)
    private double longitude;
    @Column(name = "is_demo", nullable = false)
    private boolean demo;

    protected Location() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public boolean isDemo() { return demo; }

    /** Distância geodésica aproximada (haversine) entre este local e um ponto WGS84. */
    public double distanceMetersTo(double otherLatitude, double otherLongitude) {
        return GeoDistance.meters(latitude, longitude, otherLatitude, otherLongitude);
    }
}
