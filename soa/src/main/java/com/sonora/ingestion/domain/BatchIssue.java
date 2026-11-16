package com.sonora.ingestion.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resumo auditável de um motivo de rejeição/erro numa importação, sem dados brutos.
 * kind: rejected (regra de negócio), error (item malformado) ou failure (falha do lote).
 */
public record BatchIssue(String kind, String code, long count, long firstFeatureIndex) {
    public static final String REJECTED = "rejected";
    public static final String ERROR = "error";
    public static final String FAILURE = "failure";

    /** Soma contagens por kind+code preservando o primeiro índice observado. */
    public static List<BatchIssue> merge(List<BatchIssue> current, List<BatchIssue> added) {
        Map<String, BatchIssue> merged = new LinkedHashMap<>();
        for (BatchIssue issue : current) merged.put(issue.kind + ':' + issue.code, issue);
        for (BatchIssue issue : added) {
            merged.merge(issue.kind + ':' + issue.code, issue, (old, extra) -> new BatchIssue(old.kind, old.code,
                    old.count + extra.count, Math.min(old.firstFeatureIndex, extra.firstFeatureIndex)));
        }
        return List.copyOf(new ArrayList<>(merged.values()));
    }
}
