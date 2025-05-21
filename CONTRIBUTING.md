# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue, email, or any other method with the owners of this repository before making a change.

💡 Looking to set up the project locally? Please see [docs/development.md](docs/development.md).

## Pull Request Process

This project uses gitflow branching model.

1. Ensure a Github issue exists detailing the intended feature, bugfix or change
2. Branch off `develop` branch into your `bugfix/*`, `feature/*` or `chore/*` branch
3. Develop on your new branch
4. Test (even if it's just sanity test) your new code
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
