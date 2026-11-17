package com.sonora.ingestion.admin;

import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Comando local (sem rota HTTP): java -jar sonora.jar import-ml-summary ml/output/summary.json [--allow-fixture]
 * Saída: 0 importado/já importado; 1 rejeitado (schema, fixture ou conflito); 2 uso/arquivo/banco.
 */
@Component
@ConditionalOnProperty(name = "sonora.command", havingValue = MlSummaryImportCommand.NAME)
public class MlSummaryImportCommand implements ApplicationRunner, ExitCodeGenerator {
    public static final String NAME = "import-ml-summary";
    private final MlSummaryImporter importer;
    private int exitCode = 2;

    public MlSummaryImportCommand(MlSummaryImporter importer) { this.importer = importer; }

    @Override
    public void run(ApplicationArguments args) {
        List<String> positional = args.getNonOptionArgs();
        if (positional.size() != 2 || !NAME.equals(positional.get(0))) {
            System.err.println("Usage: import-ml-summary <summary.json> [--allow-fixture]");
            return;
        }
        try {
            var result = importer.importFile(Path.of(positional.get(1)), args.containsOption("allow-fixture"));
            System.out.println("ml-summary " + result.name().toLowerCase());
            exitCode = 0;
        } catch (MlSummaryImporter.RejectedSummaryException rejected) {
            System.err.println("ml-summary rejected: " + rejected.getMessage());
            exitCode = 1;
        } catch (Exception failure) {
            System.err.println("ml-summary failed: " + failure.getClass().getSimpleName());
            exitCode = 2;
        }
    }

    @Override
    public int getExitCode() { return exitCode; }
}
