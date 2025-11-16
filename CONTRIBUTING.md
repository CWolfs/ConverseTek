# Contributing

Thank you for your interest in contributing! ConverseTek is a conversation editor for HBS's [Battletech](http://battletechgame.com/). It's main focus is only the creation and editing of conversation files in the in-game dropship (aka: `simGameConversations` files). Anything outside of this focus is considered out-of-scope.

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository before making a change.

💡 Looking to set up the project locally? Please see [docs/development.md](docs/development.md).

# Reporting Bugs & Requesting Features

Before opening an issue, please:

- Check if the issue already exists.
- Provide clear steps to reproduce (for bugs).
- For features, describe the motivation and scope.

Feature ideas must align with the goal of the project: **creating or editing conversation files**. Requests outside this scope may be rejected or deferred.

## Pull Request Process

This project uses gitflow branching model.

1. Ensure a Github issue exists detailing the intended feature, bugfix or change
2. Branch off `develop` branch into your `bugfix/*`, `feature/*` or `chore/*` branch
3. Develop on your new branch
4. Test your code (even a basic sanity check is appreciated)
5. Open a new PR that targets `develop`
6. Include a suitable description of your Pull Request along with a link to the companion Github issue
7. You may merge the Pull Request in once you have the approval of the repo owner

## Pull Request Scope

To keep the codebase maintainable and the review process efficient, please ensure your pull requests (PRs) focus on a single, clearly defined change.

✅ Good PRs:

- Address one feature, bug fix, or refactor
- Are easy to review and test
- Minimise unrelated changes

🚫 Avoid:

- PRs that touch many unrelated parts of the codebase
- Drive-by style fixes (e.g., formatting, renaming) unrelated to the purpose of the PR
- Bundling multiple concerns (e.g., feature + refactor + formatting)

Keeping PRs focused helps reviewers give timely feedback and avoids introducing regressions. If you notice multiple things to improve, feel free to open separate PRs or issues.

## Code Style & Formatting

- Follow existing code conventions and structure.
- Prefer clarity and maintainability over cleverness.
- Avoid unnecessary whitespace or formatting changes not related to your change.
- If you’re using an IDE that supports it, enable "format on save" to reduce noise in diffs.
- Ensure OmniSharp is running for C# code changes
- Ensure Prettier is running for Typescript code changes
