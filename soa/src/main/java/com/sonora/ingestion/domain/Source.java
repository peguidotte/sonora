package com.sonora.ingestion.domain;

import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

/** Fonte de dados (simulação Wokwi ou arquivo público). Define a origem de toda observação dela. */
@Entity
@Immutable
@Table(name = "sources")
public class Source {
    @Id
    private UUID id;
    @Column(nullable = false)
    private String name;
    @Column(name = "source_url", nullable = false)
    private String sourceUrl;
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;
    @Column(nullable = false)
    private String license;
    @Column(nullable = false)
    private Origin origin;

    protected Source() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSourceUrl() { return sourceUrl; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public String getLicense() { return license; }
    public Origin getOrigin() { return origin; }
}
