package com.sonora.ingestion.api;

import java.util.UUID;
import com.sonora.ingestion.api.dto.ApiError;
import com.sonora.ingestion.api.dto.BatchPage;
import com.sonora.ingestion.api.dto.BatchRequest;
import com.sonora.ingestion.api.dto.BatchView;
import com.sonora.ingestion.imports.BatchImportService;
import com.sonora.ingestion.repository.ImportBatchRepository;
import com.sonora.ingestion.security.RequiredScope;
import com.sonora.ingestion.security.Scopes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = ApiPaths.PREFIX + "/sonora/batches", produces = "application/json")
@Tag(name = "Batches", description = "Administrative imports of allowed public dataset files")
public class BatchController {
    private final BatchImportService imports;
    private final ImportBatchRepository batches;

    public BatchController(BatchImportService imports, ImportBatchRepository batches) {
        this.imports = imports;
        this.batches = batches;
    }

    @GetMapping
    @RequiredScope(Scopes.IMPORTS_MANAGE)
    @Operation(operationId = "listBatches", summary = "List persisted import jobs", description = "Newest first.")
    @ApiResponse(responseCode = "200", description = "Successful response.")
    @ApiResponse(responseCode = "400", description = "Invalid page or pageSize.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or expired API key.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Authenticated credential lacks the required scope.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public BatchPage list(@RequestParam(defaultValue = "1") @Min(1) int page,
                          @RequestParam(defaultValue = "20") @Min(1) @Max(100) int pageSize) {
        var result = batches.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page - 1, pageSize));
        return new BatchPage(result.map(BatchView::of).getContent(), page, pageSize, result.getTotalElements());
    }

    @PostMapping(consumes = "application/json")
    @RequiredScope(Scopes.IMPORTS_MANAGE)
    @Operation(operationId = "createBatch", summary = "Import an allowed public dataset file into PostgreSQL",
            description = "fileId resolves an allowed server-side source, path and location mapping (up to 50 m). "
                    + "acceptedCount counts committed observations; duplicates do not create new rows. "
                    + "Processing failures are persisted with status=failed. No HTTP delivery to another application.")
    @ApiResponse(responseCode = "201", description = "Created; inspect status and counters.", content = @Content(schema = @Schema(implementation = BatchView.class)))
    @ApiResponse(responseCode = "400", description = "Invalid body.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or expired API key.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Authenticated credential lacks the required scope.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "Unknown fileId.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", description = "Allowed file missing/unreadable or source not importable; no batch created.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ResponseEntity<BatchView> create(@Valid @RequestBody BatchRequest request) {
        return ResponseEntity.status(201).body(BatchView.of(imports.importFile(request.fileId())));
    }

    @GetMapping("/{batchId}")
    @RequiredScope(Scopes.IMPORTS_MANAGE)
    @Operation(operationId = "getBatch", summary = "Get import state and persistence counters")
    @ApiResponse(responseCode = "200", description = "Successful response.", content = @Content(schema = @Schema(implementation = BatchView.class)))
    @ApiResponse(responseCode = "400", description = "batchId is not a UUID.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or expired API key.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Authenticated credential lacks the required scope.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "404", description = "Batch not found.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public BatchView get(@Parameter(schema = @Schema(format = "uuid")) @PathVariable UUID batchId) {
        return batches.findById(batchId).map(BatchView::of).orElseThrow(() -> ApiException.notFound("Batch not found."));
    }
}
