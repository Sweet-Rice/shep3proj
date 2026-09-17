import json
from pathlib import Path

from app.models.analysis import AnalysisRequest, AnalysisResponse
from app.services.analyzer import analyze_records, load_sample


def main() -> None:
    output = Path(__file__).resolve().parents[2] / "docs" / "api-contract.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    contract = {
        "version": "0.1.0",
        "endpoints": {
            "GET /api/health": {"response": {"status": "healthy"}},
            "POST /api/analyze": {
                "request_schema": AnalysisRequest.model_json_schema(),
                "response_schema": AnalysisResponse.model_json_schema(),
            },
        },
    }
    output.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")

    sample_output = output.with_name("sample-analysis.json")
    sample = analyze_records(load_sample("compromise"))
    sample_output.write_text(
        json.dumps(sample.model_dump(mode="json"), indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
