package com.sonora.ingestion;

import java.util.Map;
import com.sonora.ingestion.admin.MlSummaryImportCommand;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IngestionApplication {
    public static void main(String[] args) {
        if (args.length > 0 && MlSummaryImportCommand.NAME.equals(args[0])) {
            // Rotina administrativa local: mesmo JAR e banco, sem servidor HTTP.
            var app = new SpringApplication(IngestionApplication.class);
            app.setWebApplicationType(WebApplicationType.NONE);
            app.setDefaultProperties(Map.of("sonora.command", MlSummaryImportCommand.NAME));
            System.exit(SpringApplication.exit(app.run(args)));
        }
        SpringApplication.run(IngestionApplication.class, args);
    }
}
