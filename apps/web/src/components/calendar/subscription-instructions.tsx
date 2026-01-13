import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vamsa/ui";

export function SubscriptionInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How to Subscribe</CardTitle>
        <CardDescription>
          Step-by-step guides for popular calendar applications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="google">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              Google Calendar
            </TabsTrigger>
            <TabsTrigger value="apple">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              Apple Calendar
            </TabsTrigger>
            <TabsTrigger value="outlook">
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              Outlook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-foreground font-medium">
                Subscribing to a calendar in Google Calendar
              </h4>
              <ol className="text-muted-foreground space-y-3 pl-6 text-sm">
                <li className="list-decimal">
                  Open{" "}
                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Calendar
                  </a>{" "}
                  in your browser
                </li>
                <li className="list-decimal">
                  On the left side, find <strong>Other calendars</strong> and
                  click the <strong>+</strong> (plus) button
                </li>
                <li className="list-decimal">
                  Select <strong>From URL</strong> from the dropdown menu
                </li>
                <li className="list-decimal">
                  Paste the calendar URL you copied above into the text field
                </li>
                <li className="list-decimal">
                  Click <strong>Add calendar</strong>
                </li>
                <li className="list-decimal">
                  The calendar will appear in your list and start syncing events
                </li>
              </ol>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">
                  <strong>Tip:</strong> Google Calendar may take a few minutes
                  to initially sync. Updates are typically refreshed every 8-24
                  hours.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="apple" className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-foreground font-medium">
                Subscribing to a calendar in Apple Calendar
              </h4>
              <ol className="text-muted-foreground space-y-3 pl-6 text-sm">
                <li className="list-decimal">
                  Open the <strong>Calendar</strong> app on your Mac, iPhone, or
                  iPad
                </li>
                <li className="list-decimal">
                  <strong>On Mac:</strong> Click <strong>File</strong> in the
                  menu bar, then select{" "}
                  <strong>New Calendar Subscription...</strong>
                  <br />
                  <strong>On iPhone/iPad:</strong> Tap{" "}
                  <strong>Calendars</strong> at the bottom, then tap{" "}
                  <strong>Add Calendar</strong> and select{" "}
                  <strong>Add Subscription Calendar</strong>
                </li>
                <li className="list-decimal">
                  Paste the calendar URL you copied above
                </li>
                <li className="list-decimal">
                  Click or tap <strong>Subscribe</strong>
                </li>
                <li className="list-decimal">
                  Customize the calendar name, color, and update frequency if
                  desired
                </li>
                <li className="list-decimal">
                  Click or tap <strong>OK</strong> to finish
                </li>
              </ol>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">
                  <strong>Tip:</strong> You can set the auto-refresh interval
                  from every 5 minutes to once a week in the subscription
                  settings.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outlook" className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-foreground font-medium">
                Subscribing to a calendar in Outlook
              </h4>

              <div className="space-y-4">
                <div>
                  <h5 className="text-foreground mb-2 text-sm font-medium">
                    Outlook.com (Web)
                  </h5>
                  <ol className="text-muted-foreground space-y-3 pl-6 text-sm">
                    <li className="list-decimal">
                      Open{" "}
                      <a
                        href="https://outlook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Outlook.com
                      </a>{" "}
                      and go to your calendar
                    </li>
                    <li className="list-decimal">
                      Click <strong>Add calendar</strong> in the left sidebar
                    </li>
                    <li className="list-decimal">
                      Select <strong>Subscribe from web</strong>
                    </li>
                    <li className="list-decimal">
                      Paste the calendar URL in the{" "}
                      <strong>Link to the calendar</strong> field
                    </li>
                    <li className="list-decimal">
                      Enter a calendar name and choose a color (optional)
                    </li>
                    <li className="list-decimal">
                      Click <strong>Import</strong>
                    </li>
                  </ol>
                </div>

                <div>
                  <h5 className="text-foreground mb-2 text-sm font-medium">
                    Outlook Desktop (Windows/Mac)
                  </h5>
                  <ol className="text-muted-foreground space-y-3 pl-6 text-sm">
                    <li className="list-decimal">
                      Open Outlook and go to your calendar view
                    </li>
                    <li className="list-decimal">
                      Click <strong>Open Calendar</strong> dropdown (or{" "}
                      <strong>File → Account Settings</strong>)
                    </li>
                    <li className="list-decimal">
                      Select <strong>From Internet...</strong>
                    </li>
                    <li className="list-decimal">
                      Paste the calendar URL you copied above
                    </li>
                    <li className="list-decimal">
                      Click <strong>OK</strong> and then <strong>Yes</strong> to
                      confirm
                    </li>
                  </ol>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">
                  <strong>Note:</strong> Outlook syncs subscribed calendars
                  periodically. Changes may take a few hours to appear.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* RSS Feed Instructions */}
        <div className="border-border mt-8 space-y-3 border-t pt-6">
          <h4 className="text-foreground font-medium">RSS Feed Readers</h4>
          <p className="text-muted-foreground text-sm">
            To subscribe to the RSS feed of family updates, copy the RSS URL and
            add it to your favorite RSS reader:
          </p>
          <ul className="text-muted-foreground space-y-2 pl-6 text-sm">
            <li className="list-disc">
              <strong>Feedly:</strong> Click <strong>Add Content</strong> and
              paste the RSS URL
            </li>
            <li className="list-disc">
              <strong>Inoreader:</strong> Click <strong>Add new</strong> and
              enter the RSS URL
            </li>
            <li className="list-disc">
              <strong>RSS Reader Apps:</strong> Most apps have an &quot;Add
              Feed&quot; or &quot;Subscribe&quot; button where you can paste
              the URL
            </li>
            <li className="list-disc">
              <strong>Browser Extensions:</strong> Extensions like Feedbro
              (Firefox/Chrome) can detect and subscribe to RSS feeds
              automatically
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
