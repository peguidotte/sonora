package com.sonora.ingestion.domain;

import java.util.UUID;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

/** UUID gerado pelo domínio: um save() de registro novo vira INSERT direto, sem SELECT/merge prévio. */
@MappedSuperclass
public abstract class AssignedIdEntity implements Persistable<UUID> {
    @Transient
    private boolean isNew = true;

    @Override
    public boolean isNew() { return isNew; }

    @PostLoad
    @PostPersist
    void markPersisted() { isNew = false; }
}
