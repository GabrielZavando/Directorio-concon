# Makefile — Stack-agnostic CI interface for Zavando Specboot projects
#
# Each stack implements the same set of targets (install, lint, test, build,
# audit, commitlint). CI (.github/workflows/ci.yml) only invokes these targets,
# never the underlying commands, so the pipeline stays identical across projects.
#
# To customize for your stack, adjust the commands inside each target or add a
# new branch to the STACK detection below.

.PHONY: help install lint test build audit commitlint refs

# Detect the active stack from its manifest file.
STACK := $(shell \
  if [ -f package.json ]; then echo node; \
  elif [ -f composer.json ]; then echo php; \
  elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then echo python; \
  elif [ -f go.mod ]; then echo go; \
  elif [ -f Cargo.toml ]; then echo rust; \
  else echo unknown; fi)

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

install: ## Install dependencies (stack-specific)
	@case "$(STACK)" in \
	  node)   npm --prefix backend ci ;; \
	  php)    composer install --no-interaction ;; \
	  python) pip install -r requirements.txt ;; \
	  go)     go mod download ;; \
	  rust)   cargo fetch ;; \
	  *)      echo "install: no stack detected — personalize the project and add install steps" ;; \
	esac

lint: ## Lint and static analysis (stack-specific)
	@case "$(STACK)" in \
	  node)   npm --prefix backend run lint ;; \
	  php)    composer lint ;; \
	  python) ruff check . ;; \
	  go)     go vet ./... ;; \
	  rust)   cargo clippy -- -D warnings ;; \
	  *)      bash specboot.sh --ci ;; \
	esac
	@$(MAKE) refs

test: ## Run the test suite (stack-specific)
	@case "$(STACK)" in \
	  node)   npm --prefix backend test ;; \
	  php)    composer test ;; \
	  python) pytest ;; \
	  go)     go test ./... ;; \
	  rust)   cargo test ;; \
	  *)      echo "test: no stack detected — add your test command" ;; \
	esac
	@$(MAKE) refs

build: ## Build the project (stack-specific)
	@case "$(STACK)" in \
	  node)   npm --prefix backend run build ;; \
	  php)    composer install --no-dev --optimize-autoloader ;; \
	  python) pip install -e . ;; \
	  go)     go build ./... ;; \
	  rust)   cargo build --release ;; \
	  *)      echo "build: no stack detected — add your build command" ;; \
	esac

audit: ## Security audit (stack-specific)
	@case "$(STACK)" in \
	  node)   npm audit --audit-level=high ;; \
	  php)    composer audit ;; \
	  python) pip-audit ;; \
	  go)     go list -m -u ;; \
	  rust)   cargo audit ;; \
	  *)      echo "audit: no stack detected — add your audit command" ;; \
	esac

commitlint: ## Lint commit messages (stack-independent)
	npx -p @commitlint/cli -p @commitlint/config-conventional commitlint --from HEAD~1 --to HEAD --verbose

refs: ## Check referential integrity of {file:...} references
	bash check-refs.sh
