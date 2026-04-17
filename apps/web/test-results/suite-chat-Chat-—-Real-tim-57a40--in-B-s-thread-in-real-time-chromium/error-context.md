# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: suite-chat.spec.ts >> Chat — Real-time send & receive >> message sent by A appears in B's thread in real time
- Location: e2e/suite-chat.spec.ts:38:3

# Error details

```
Test timeout of 120000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: The
        - generic [ref=e7]: Penthouse
      - generic [ref=e8]:
        - generic "idle" [ref=e9]
        - button "New message" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
    - main [ref=e14]:
      - button "General Tue Channel" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: General
            - generic [ref=e23]: Tue
          - generic [ref=e24]: Channel
  - dialog "New message" [ref=e25]:
    - document [ref=e26]:
      - generic [ref=e28]:
        - paragraph [ref=e29]: New message
        - button "Close" [ref=e30] [cursor=pointer]:
          - img [ref=e31]
      - generic [ref=e34]:
        - generic [ref=e35]:
          - img
          - textbox "Search by name or username..." [ref=e36]: chat_b_1775844598118
        - button "C chat_b_1775844598118 @chat_b_1775844598118" [ref=e38] [cursor=pointer]:
          - generic [ref=e41]: C
          - generic [ref=e42]:
            - generic [ref=e43]: chat_b_1775844598118
            - generic [ref=e44]: "@chat_b_1775844598118"
  - navigation "Main navigation" [ref=e45]:
    - button "Chats" [ref=e46] [cursor=pointer]:
      - img [ref=e48]
      - generic [ref=e50]: Chats
    - button "People" [ref=e51] [cursor=pointer]:
      - img [ref=e53]
      - generic [ref=e58]: People
    - button "Settings" [ref=e59] [cursor=pointer]:
      - img [ref=e61]
      - generic [ref=e64]: Settings
```