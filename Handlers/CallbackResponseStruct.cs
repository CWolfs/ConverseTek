namespace ConverseTek.Handlers
{
    /// <summary>
    /// The callback response struct.
    /// </summary>
    internal struct CallbackResponseStruct
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="CallbackResponseStruct"/> struct.
        /// </summary>
        /// <param name="response">
        /// The response.
        /// </param>
        public CallbackResponseStruct(string response)
        {
            this.ResponseText = response;
        }

        /// <summary>
        /// Gets or sets the response text.
        /// </summary>
        public string ResponseText { get; set; }
    }
}