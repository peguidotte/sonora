package com.sonora.ingestion.api;

import com.sonora.ingestion.api.dto.ApiError;
import com.sonora.ingestion.api.dto.IngestResult;
import com.sonora.ingestion.api.dto.ObservationIngest;
import com.sonora.ingestion.security.Credential;
import com.sonora.ingestion.security.RequiredScope;
import com.sonora.ingestion.security.Scopes;
import com.sonora.ingestion.service.ObservationIngestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiPaths.PREFIX + "/sonora/observations")
@Tag(name = "Observations", description = "Simulated IoT (ESP32/Wokwi) observations")
public class ObservationController {
    private final ObservationIngestionService ingestion;

    public ObservationController(ObservationIngestionService ingestion) { this.ingestion = ingestion; }

    @PostMapping(consumes = "application/json", produces = "application/json")
    @RequiredScope(Scopes.OBSERVATIONS_WRITE)
    @Operation(operationId = "ingestObservation", summary = "Validate and persist an authorized simulated device observation",
            description = "Origin, location, method and calibration come from the device registry. "
                    + "Deduplicated by source + externalId: identical retry -> 200 duplicate=true; different content -> 409.")
    @ApiResponse(responseCode = "201", description = "Created.", content = @Content(schema = @Schema(implementation = IngestResult.class)))
    @ApiResponse(responseCode = "200", description = "Identical retry; nothing new stored.", content = @Content(schema = @Schema(implementation = IngestResult.class)))
    @ApiResponse(responseCode = "400", description = "Invalid body, range or unknown field.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "401", description = "Missing, invalid, revoked or expired API key.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "403", description = "Missing scope, other device, unknown or disabled device.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "409", description = "externalId already stored with different content.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    @ApiResponse(responseCode = "422", description = "observedAt more than 5 minutes in the future.", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public ResponseEntity<IngestResult> ingest(@RequestAttribute(Credential.REQUEST_ATTRIBUTE) Credential credential,
                                               @Valid @RequestBody ObservationIngest request) {
        var outcome = ingestion.ingest(credential, request);
        var body = new IngestResult(outcome.observation().getId(), outcome.duplicate(), outcome.observation().getOrigin().wire());
        return ResponseEntity.status(outcome.duplicate() ? 200 : 201).body(body);
    }
}
