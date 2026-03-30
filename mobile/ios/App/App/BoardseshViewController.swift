import UIKit
import Capacitor

class BoardseshViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Disable rubber-band bounce so the page cannot overscroll
        webView?.scrollView.bounces = false

        // Match the dark theme background to avoid white flash
        webView?.isOpaque = false
        webView?.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1)
        webView?.scrollView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1)
    }
}
