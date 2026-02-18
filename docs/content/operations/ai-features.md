# AI Features (Optional)

Vamsa can use AI to help with smart suggestions, relationship hints, and search assistance. This is completely optional -- Vamsa works perfectly without it. You can enable AI at any time and disable it just as easily.

---

## Privacy first

Before setting anything up, here is what you need to know about privacy:

| Option | Your data stays on your machine? | Cost |
|--------|----------------------------------|------|
| **Ollama (local)** | Yes -- everything runs on your hardware | Free |
| **Cloud LLMs (OpenAI, Groq)** | No -- requests are sent to a third-party server | Pay per use |

!!! info "What does the AI see?"
    When you use an AI feature (like asking for relationship suggestions), Vamsa sends the relevant names and relationships to the AI model. With a local model (Ollama), this data never leaves your machine. With a cloud provider, it is sent over the internet to their servers.

If privacy is important to you -- and with family data, it often is -- use Ollama for a fully local setup.

---

## Setting up Ollama (recommended)

Ollama lets you run AI models directly on your own machine. It is free, private, and works offline.

### Step 1 -- Install Ollama

Download and install Ollama from [https://ollama.ai](https://ollama.ai).

After installation, verify it is running:

```bash
ollama --version
```

You should see:

```
ollama version 0.5.x
```

### Step 2 -- Download a model

```bash
ollama pull qwen2.5:1.5b
```

You should see:

```
pulling manifest
pulling abc123... 100% ████████████████ 1.0 GB
verifying sha256 digest
writing manifest
success
```

!!! tip "Choosing a model"
    The model you choose depends on your hardware. Smaller models are faster but less capable. Larger models give better results but need more memory.

    | Hardware | Recommended model | Download size | RAM needed |
    |----------|-------------------|---------------|------------|
    | Raspberry Pi / low-power | `qwen2.5:1.5b` | ~1 GB | 2 GB |
    | Desktop / homelab | `llama3.2:3b` or `mistral:7b` | 2-4 GB | 4-8 GB |
    | Powerful server with GPU | `llama3.1:70b` | ~40 GB | 40+ GB |

    To download a different model:

    ```bash
    ollama pull llama3.2:3b
    ```

### Step 3 -- Configure Vamsa

Open your `.env` file and set these variables:

```ini
LLM_PROVIDER="ollama"
LLM_URL="http://localhost:11434/v1"
LLM_MODEL="qwen2.5:1.5b"
VAMSA_AI_ENABLED=true
```

### Step 4 -- Restart Vamsa

For Docker:

```bash
docker compose --env-file .env -f docker/docker-compose.yml restart app
```

For bare metal, restart your Vamsa process.

### Step 5 -- Verify AI is working

Open Vamsa in your browser. You should see AI-related features appear in the interface (for example, suggestion icons next to search results or relationship fields).

Check the logs to confirm the AI connection:

```bash
# Docker
docker compose --env-file .env -f docker/docker-compose.yml logs app | grep -i ai

# Bare metal
# Check your log output for AI-related messages
```

---

## Using the Docker AI sidecar

If you run Vamsa with Docker, there is a dedicated AI sidecar container that handles AI requests separately from the main application.

### Start with the AI profile

```bash
docker compose --env-file .env -f docker/docker-compose.yml --profile ai up -d
```

You should see:

```
[+] Running 3/3
 ✔ Container vamsa-db    Running
 ✔ Container vamsa-app   Running
 ✔ Container vamsa-ai    Started
```

!!! info "What is the AI sidecar?"
    The AI sidecar is a separate container that handles AI requests. It communicates with Ollama (running on your host machine) or a cloud LLM provider. Keeping it separate means AI processing does not slow down the main application.

The sidecar reads the same `LLM_PROVIDER`, `LLM_URL`, and `LLM_MODEL` settings from your `.env` file.

!!! warning "Docker and Ollama networking"
    When Ollama runs on your host machine and the AI sidecar runs in Docker, the sidecar cannot reach `localhost`. Vamsa's Docker setup handles this automatically by using `host.docker.internal` as the default Ollama address. You do not need to change anything.

---

## Using cloud LLMs

If you prefer faster responses and do not mind sending data to a cloud provider, you can use OpenAI, Groq, or any OpenAI-compatible API.

### OpenAI

1. Get an API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Set these in your `.env`:

```ini
LLM_PROVIDER="openai"
LLM_URL="https://api.openai.com/v1"
LLM_MODEL="gpt-4o-mini"
LLM_API_KEY="sk-your-api-key-here"
VAMSA_AI_ENABLED=true
```

### Groq (fast and affordable)

1. Get an API key from [https://console.groq.com/keys](https://console.groq.com/keys)
2. Set these in your `.env`:

```ini
LLM_PROVIDER="openai-compatible"
LLM_URL="https://api.groq.com/openai/v1"
LLM_MODEL="llama-3.3-70b-versatile"
LLM_API_KEY="gsk_your-api-key-here"
VAMSA_AI_ENABLED=true
```

!!! warning "Cloud providers charge for usage"
    Both OpenAI and Groq charge based on the number of tokens (roughly, words) processed. For typical Vamsa usage, costs are very low (usually under $1/month), but keep an eye on your usage dashboard.

After setting your `.env`, restart Vamsa.

---

## Disabling AI

To turn off all AI features:

1. Set this in your `.env`:

```ini
VAMSA_AI_ENABLED=false
```

2. Restart Vamsa.

If you started the Docker AI sidecar, you can stop it:

```bash
docker compose --env-file .env -f docker/docker-compose.yml --profile ai stop ai
```

---

## Troubleshooting AI

**"AI features don't appear in the interface"**

- Check that `VAMSA_AI_ENABLED=true` is set in your `.env`
- Restart Vamsa after changing the setting

**"AI requests are timing out"**

- If using Ollama, make sure it is running: `ollama list` should show your downloaded model
- If using a cloud provider, check that your API key is valid
- Check logs for error messages: `docker compose logs app | grep -i ai`

**"Ollama is slow"**

- Smaller models are faster. Try `qwen2.5:1.5b` if you are using a larger model
- If you have a GPU, Ollama will use it automatically for much better performance
- On a Raspberry Pi, expect a few seconds per response -- this is normal

---

## Next steps

- **[Security](security.md)** -- Protect your instance and understand how data flows
- **[Monitoring](monitoring.md)** -- Keep an eye on your Vamsa installation
- **[Troubleshooting](troubleshooting.md)** -- Solutions for common problems
